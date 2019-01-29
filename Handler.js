const {
    Collection
} = require('discord.js')
const Discord = require('discord.js')
const fs = require('fs')
const DB = require('nedb')
const cooldown = new Set()
let cdseconds = 5

class Handler {
    constructor(Client, data = {}) {
        this.Client = Client
        this.Client.db = new DB({
            filename: './main.db',
            autoload: true
        })
        this.Client.guildPrefixes = new Collection()
        if (!this.Client) return new Error('Client must not be empty')
        if (!data.directory) return new Error('Directory must not be empty')
        if (!data.prefixes) return new Error('Prefix must not be empty')
        if (!data.owners || data.owners.length < 1) {
            this.Client.owners = false
            console.log('Owner is empty, you will not be able to use owner commands.')
        } else {
            if (!Array.isArray(data.owners)) data.owners = [data.owners]
            this.Client.owners = data.owners
        }
        if (!Array.isArray(data.prefixes)) data.prefixes = [data.prefixes]
        if (data.disabled && !Array.isArray(data.disabled)) data.disabled = [data.disabled];
        else data.disabled = []
        this.Client.commands = new Collection()
        this.Client.aliases = new Collection()
        this.Client.prefixes = data.prefixes
        this.Client.disabled = data.disabled
        this.loadDeveloperCommands()
        this.loadDefaultCommands(data.directory)
        this.Client.db.find({}, async (err, data) => {
            data.forEach(d => {
                if (d) this.Client.guildPrefixes.set(d.id, d.prefix)
            })
        })
        Client.on('message', this._message.bind(this))
    }

    async _message(message) {
        if (message.author.bot) return
        let prefix = false
        let prefixes = [this.Client.guildPrefixes.get(message.guild.id) || null].concat(this.Client.prefixes)
        for (const Prefix of prefixes) {
            if (message.content.startsWith(Prefix)) prefix = Prefix
        }
        if (!message.content.startsWith(prefix) || !prefix) return
        if (cooldown.has(message.author.id)) {
            const embed = new Discord.RichEmbed()
                .setColor(`#36393E`)
                .setDescription(`<@${message.author.id}>, You have to wait 5 seconds before using the command again.`);
            return message.channel.send(embed);
        }
        let args = message.content.slice(prefix.length).trim().split(/ +/)
        let command = args.shift().toLowerCase()
        command = this.getCommand(command)
        if (command.error) return
        if (command.isOwner() && (!this.Client.owners || !this.Client.owners.includes(message.author.id))) return message.reply('You have no permission to use this!')
        if (command.isNSFW() && !message.channel.nsfw) return message.reply('This command is marked as NSFW, please use it in a NSFW channel.')
        try {
            if (command) {
                if (message.author.id !== '286713468285878272') {
                    cooldown.add(message.author.id);
                }
                command.run(message.client, message, args);
            }
        } catch (err) {
            return message.reply(`Oops, this shouldn't happen, please contact ${this.Client.owners.length < 1 ?
                'the bot owners' : this.Client.owners.map(o => !message.client.users.get(o) ? o :
                    message.client.users.get(o).tag).join(', or ')}. Here's the error\n\n\`${err.message}\``)
        }
        setTimeout(() => {
            cooldown.delete(message.author.id)
        }, cdseconds * 1000);
    }

    getCommand(command) {
        if (!this.Client.commands.get(command)) command = this.Client.aliases.get(command)
        if (!command || (this.disabled && this.disabled.includes(command))) return {
            error: "Not a command"
        }
        return this.Client.commands.get(command)
    }

    loadDeveloperCommands() {
        for (const file of fs.readdirSync(__dirname + '/commands/')) {
            let command = require(__dirname + '/commands/' + file)
            command = new command()
            this.Client.commands.set(command.getName(), command)
            for (const alias of command.getAliases()) {
                this.Client.aliases.set(alias, command.getName())
            }
        }
    }

    loadDefaultCommands(directory) {
        let commands = fs.readdirSync(directory)
        commands.filter(f => fs.statSync(directory + f).isDirectory())
            .forEach(nestedDir => fs.readdirSync(directory + nestedDir)
                .forEach(f => commands.push(`${nestedDir}/${f}`)))
        commands = commands.filter(f => f.endsWith('.js'))
        if (commands.length < 1) return new Error(`'${directory}' has no commands in it.`)

        for (const file of commands) {
            let command = require(directory + file)
            command = new command()
            if (!command.getName()) return new Error(`'${file}' doesn't have a name.`)
            this.Client.commands.set(command.getName(), command)
            for (const alias of command.getAliases()) {
                this.Client.aliases.set(alias, command.getName())
            }
        }
    }
}

module.exports = Handler
