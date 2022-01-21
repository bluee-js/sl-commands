import { Collection } from 'discord.js'
import { existsSync } from 'fs'
import { glob } from 'glob'

import { CommandType, SubCommandType } from '../typings'
import HandlerUtils from './HandlerUtils'
import SLCommands, { Command } from '.'

class CommandHandler {
	private _subcommands = new Collection<string, Command>()
	private _commands = new Collection<string, Command>()

	constructor(handler: SLCommands, dir: string) {
		if (!dir) return

		if (!existsSync(dir)) {
			handler.logger.error(`The directory '${dir}' does not exists.`)
			return
		}

		try {
			this.load(handler, dir)
			new HandlerUtils().setUp(handler, this._commands, this._subcommands)
		} catch (e) {
			handler.logger.error(`Ocurred an error while loading commands.\n`, e)
		}
	}

	private load(handler: SLCommands, dir: string) {
		dir += '/**/*{.ts,.js}'
		let commandFiles = glob.sync(dir, { absolute: true })

		for (let file of commandFiles) {
			let command: Command = require(file)?.default
			if (!command) continue

			if (command.type === 'SUBCOMMAND') {
				this._subcommands.set(command.reference + ' ' + command.name, command)
			} else {
				if (command.testOnly === undefined) {
					command.testOnly = handler.testOnly
				}

				this._commands.set(command.name, command)
			}
		}

		handler.logger.tag(
			'COMMANDS',
			`Loaded ${
				this.commandsArray.length + this.subcommandsArray.length
			} commands.`
		)

		handler.client.once('ready', () => this.registerCommands(handler))
	}

	private async registerCommands(handler: SLCommands) {
		let register = [...this.commandsArray] as Exclude<
			CommandType,
			SubCommandType
		>[]

		let global = register.filter(c => !c.testOnly)
		let test = register.filter(c => c.testOnly)

		handler.client.application?.commands.set(global)

		for (let id of handler.testServers) {
			;(await handler.client.guilds.fetch(id))?.commands.set(test)
		}
	}

	/** @returns The commands collection */
	public get commands() {
		return this._commands
	}

	/** @returns The subcommands collection */
	public get subcommands() {
		return this._subcommands
	}

	/** @returns The commands array */
	public get commandsArray() {
		return Array.from(this._commands.values())
	}

	/** @returns The subcommands array */
	public get subcommandsArray() {
		return Array.from(this._subcommands.values())
	}
}

export = CommandHandler
