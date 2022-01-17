import {
	CommandInteractionOptionResolver,
	ChatInputApplicationCommandData,
	MessageApplicationCommandData,
	MessageContextMenuInteraction,
	UserContextMenuInteraction,
	UserApplicationCommandData,
	CommandInteractionOption,
	ContextMenuInteraction,
	CommandInteraction,
	GuildMember,
	Message,
	Client,
	Guild,
	User,
} from 'discord.js'

import { Connection, ConnectOptions } from 'mongoose'
import BlueyCommands, { permissions } from './src'
import { EventEmitter } from 'events'
import { Chalk } from 'chalk'

/* SYSTEM */

export interface HandlerEvents {
	databaseConnected: [connection: Connection, state: string]
	commandException: [commandName: string, error: Error]
}

export interface HandlerOptions {
	featuresDir?: string
	commandsDir?: string
	eventsDir?: string
	botToken: string
	testServers?: string | string[]
	botOwners?: string | string[]
	dbOptions?: ConnectOptions
	showWarns?: boolean
	testOnly?: boolean
	mongoUri?: string
}

export default class SLCommands extends EventEmitter {
	private _client: Client
	private _token: string
	private _eventsDir: string
	private _commandsDir: string
	private _featuresDir: string
	private _botOwners: string[]
	private _testServers: string[]
	private _showWarns: boolean
	private _testOnly: boolean
	private _mongoConnection: Connection | null
	private _commandHandler: CommandHandler | null
	private _eventHandler: EventHandler | null

	constructor(client: Client, options: HandlerOptions)

	public logger: {
		hex(hex: string): Chalk
		bgHex(hex: string): Chalk
		warn(...args: any[]): void
		error(...args: any[]): void
		success(...args: any[]): void
		tag(tag: string, ...args: any[]): void
		create(hex: string, prefix: string): string
		custom(tag: string, hex: string, ...args: any[]): void
	}

	public addTestServers(...ids: string[]): this
	public addBotOwners(...ids: string[]): this
	public isDBConnected(): boolean

	public get mongoConnection(): Connection | null
	public get commandHandler(): CommandHandler
	public get eventHandler(): EventHandler
	public get testServers(): string[]
	public get botOwners(): string[]
	public get showWarns(): boolean
	public get testOnly(): boolean
	public get client(): Client

	public on<K extends keyof HandlerEvents>(
		event: K,
		listener: (...args: HandlerEvents[K]) => Awaitable<void>
	)

	public once<K extends keyof HandlerEvents>(
		event: K,
		listener: (...args: HandlerEvents[K]) => Awaitable<void>
	)

	public emit<K extends keyof HandlerEvents>(
		event: K,
		...args: HandlerEvents[K]
	): boolean

	public off<K extends keyof HandlerEvents>(
		event: K,
		listener: (...args: HandlerEvents[K]) => Awaitable<void>
	): this

	public removeAllListeners<K extends keyof HandlerEvents>(event?: K): this
}

/* UTILS */

export type PermString = keyof typeof permissions
export type Awaitable<T> = T | PromiseLike<T>

type BaseInteraction = {
	member: GuildMember
	guild: Guild & {
		me: GuildMember
	}
}

/* COMMANDS & CONTEXTS */

export type ECommandInteraction = BaseInteraction & CommandInteraction
export type EContextInteraction<T extends 'MESSAGE' | 'USER'> =
	BaseInteraction &
		(T extends 'USER'
			? UserContextMenuInteraction
			: MessageContextMenuInteraction)

export type CommandType = ChatInputType | MessageType | UserType | SubType
export type Callback = ChatInputCallback | MessageCallback | UserCallback

export type SubType = {
	type: 'SUBCOMMAND'
	name: string
	reference: string
	callback: (obj: {
		client: Client
		handler: BlueyCommands
		interaction: ECommandInteraction
		options?: CommandInteractionOptionResolver
	}) => any
}

export type ChatInputType = {
	type: 'CHAT_INPUT'
	callback: (obj: {
		client: Client
		handler: BlueyCommands
		interaction: ECommandInteraction
		options?: CommandInteractionOptionResolver
	}) => any
} & BaseType &
	ChatInputApplicationCommandData

export type MessageType = {
	type: 'MESSAGE'
	callback: (obj: {
		client: Client
		target: Message
		handler: BlueyCommands
		interaction: EContextInteraction<'MESSAGE'>
	}) => any
} & BaseType &
	MessageApplicationCommandData

export type UserType = {
	type: 'USER'
	callback: (obj: {
		target: User
		client: Client
		handler: BlueyCommands
		interaction: EContextInteraction<'USER'>
	}) => any
} & BaseType &
	UserApplicationCommandData

interface BaseType {
	permissions?: PermString | PermString[]
	testOnly?: boolean
	devsOnly?: boolean
}

export type ChatInputCallback = ChatInputType['callback']
export type MessageCallback = MessageType['callback']
export type UserCallback = UserType['callback']
