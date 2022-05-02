import {
	CommandInteractionOptionResolver,
	MessageContextMenuInteraction,
	UserContextMenuInteraction,
	InteractionReplyOptions,
	GuildMember,
	Collection,
	Message,
	Guild,
} from 'discord.js'

import {
	ECommandInteraction,
	EContextInteraction,
	ChatInputCallback,
	MessageCallback,
	SubCommandType,
	UserCallback,
	PermString,
} from '../typings'

import SLCommands, { Command } from '.'
import perms from '../permissions.json'
import getMessage from './MessageHandler'

type ICollection = Collection<string, Command>

class HandlerUtils {
	setUp(handler: SLCommands, commands: ICollection, subcommands: ICollection) {
		let { client, language, botOwners } = handler

		client.on('interactionCreate', async inter => {
			if (!inter.isCommand() && !inter.isContextMenu()) return

			let command = commands.get(inter.commandName)
			if (!command) return

			let int: ECommandInteraction | EContextInteraction<'MESSAGE' | 'USER'>
			let { permissions, devsOnly, callback, type, hasSub } = command

			if (type === 'CHAT_INPUT') int = inter as ECommandInteraction
			else if (type === 'USER') int = inter as EContextInteraction<'USER'>
			else int = inter as EContextInteraction<'MESSAGE'>

			let { member, guild } = int

			let verified = this.verify(
				permissions,
				botOwners,
				devsOnly,
				language,
				member,
				guild
			)

			if (verified) {
				int.reply(verified)
				return
			}

			if (type == 'CHAT_INPUT') {
				if (!int.isCommand()) return
				let subName: string

				try {
					subName = int.options.getSubcommand()
				} catch {
					null
				}

				let subCommand = subcommands.find(
					s => s.name === subName && s.reference === int.commandName
				)

				if (hasSub && subCommand) {
					let { callback } = subCommand as SubCommandType

					try {
						await callback({
							options: int.options as OptRsvlr,
							interaction: int,
							handler,
							client,
						})
					} catch (err) {
						handler.emit('commandException', subCommand.name ?? 'unknown', err)
					}
					return
				}
			} else if (!int.isContextMenu()) return

			try {
				if (type === 'CHAT_INPUT') {
					callback = callback as ChatInputCallback

					let optionsArray: (string | number | boolean)[] = []

					for (let option of int.options.data) {
						if (option.type === 'SUB_COMMAND') {
							if (option.name) optionsArray.push(option.name)
							option.options?.forEach(x => {
								if (x.value) optionsArray.push(x.value)
							})
						} else if (option.value) optionsArray.push(option.value)
					}

					await callback({
						options: int.options as CommandInteractionOptionResolver,
						interaction: int as ECommandInteraction,
						optionsArray,
						handler,
						client,
					})
				} else if (type === 'MESSAGE') {
					callback = callback as MessageCallback
					await callback({
						target: (int as MessageContextMenuInteraction)
							.targetMessage as Message,
						interaction: int as EContextInteraction<'MESSAGE'>,
						handler,
						client,
					})
				} else {
					callback = callback as UserCallback
					await callback({
						target: (int as UserContextMenuInteraction).targetUser,
						interaction: int as EContextInteraction<'USER'>,
						handler,
						client,
					})
				}
			} catch (err) {
				handler.emit('commandException', command.name ?? 'unknown', err)
			}
		})
	}

	verify(
		reqPerms: PermString[] = [],
		botOwners: string[] = [],
		devsOnly: boolean = false,
		language: keyof typeof perms,
		target: GuildMember,
		guild: Guild
	): InteractionReplyOptions | null {
		if (devsOnly && !botOwners.includes(target.id)) {
			return {
				content: getMessage('DEV_ONLY', language),
				ephemeral: true,
			}
		}

		if (reqPerms.length) {
			let missMe = missing(guild.me!, reqPerms, language)
			let missIt = missing(target, reqPerms, language)
			let str

			if (missIt.length) {
				str = strs(missIt)

				return {
					content: getMessage('PERMS_USER', language, {
						S: str.s,
						A: str.a,
						PERMISSIONS: `${str}`,
					}),
					ephemeral: true,
				}
			}

			if (missMe.length) {
				str = strs(missMe)

				return {
					content: getMessage('PERMS_BOT', language, {
						S: str.s,
						A: str.a,
						PERMISSIONS: `${str}`,
					}),
					ephemeral: true,
				}
			}
		}

		return null
	}
}

function missing(
	target: GuildMember,
	required: PermString[],
	language: keyof typeof perms
) {
	let miss = target.permissions
		.missing(required, true)
		.map(e => perms[language][e as PermString])

	if (miss.includes('Administrador')) return ['Administrador']
	if (miss.includes('Administrator')) return ['Administrator']
	return miss
}

function strs(array: string[]) {
	return {
		s: array.length > 1 ? 's' : '',
		a: array.length > 1 ? 'ões' : 'ão',
		toString: () => `\`${array.join(', ')}\``,
	}
}

type OptRsvlr = CommandInteractionOptionResolver

export = HandlerUtils
