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
        if (message.author.bot) return;
    if (message.channel.type !== 'text') {
        if (message.content = 'https://discord.gg') return;
        let active = await db.fetch(`support_${message.author.id}`);
        let guild = client.guilds.get('446775078240387093');
        let role = guild.roles.find('name', "Member");
        let channel, found = true;
        try {
            if (active) client.channels.get(active.channelID)
                .guild;
        } catch (e) {
            found = false;
        }
        if (!active || !found) {
            active = {};
            channel = await guild.createChannel(`${message.author.username}-${message.author.discriminator}`).then(channel => channel.setParent("463841242678034472"));
            channel.overwritePermissions(
                role, {
                    'READ_MESSAGES': false
                }
            )
            let author = message.author;
            const newChannel = new Discord.RichEmbed()
                .setColor('RANDOM')
                .setAuthor(author.tag, author.displayAvatarURL)
                .setFooter('Support Ticket Created!')
                .addField('User', author)
                .addField('ID', author.id)
            await channel.send(newChannel);
            await channel.send('<@285077327074033676> You got a new support ticket.')
            const newTicket = new Discord.RichEmbed()
                .setColor('RANDOM')
                .setAuthor(`Hello, ${author.username}`, author.displayAvatarURL)
                .setFooter('Support Ticket Created!')
            await author.send(newTicket);
            active.channelID = channel.id;
            active.targetID = author.id;
        }
        channel = client.channels.get(active.channelID);
        const dm = new Discord.RichEmbed()
            .setColor('RANDOM')
            .setDescription(message.content)
            .setAuthor(`Thank you, ${message.author.username}`, message.author.displayAvatarURL)
            .setFooter(`Your message has been sent - A staff member will be in contact soon.`)
        await message.author.send(dm);
        if (message.content === '!complete') return;
        const embed = new Discord.RichEmbed()
            .setColor('RANDOM')
            .setAuthor(message.author.tag, message.author.displayAvatarURL)
            .setDescription(message.content)
            .setFooter(`Message Received - ${message.author.tag}`)
        await channel.send(embed);
        db.set(`support_${message.author.id}`, active);
        db.set(`supportChannel_${channel.id}`, message.author.id);
        return;
    }
    let support = await db.fetch(`supportChannel_${message.channel.id}`);
    if (support) {
        support = await db.fetch(`support_${support}`);
        let supportUser = client.users.get(support.targetID);
        if (!supportUser) return message.channel.delete();
        if (message.content.toLowerCase() === '!complete') {
            const complete = new Discord.RichEmbed()
                .setColor('RANDOM')
                .setAuthor(`Hey, ${supportUser.tag}`, supportUser.displayAvatarURL)
                .setFooter('Ticket Closed -- FallenTheTaco Lab')
                .setDescription('*Your ticket has been marked as complete. If you wish to reopen it, or create a new one, please send a message to the bot.*')
            supportUser.send(complete);
            message.channel.setParent('525343816035860480');
            return db.delete(`support_${support.targetID}`);
        }
        const embed = new Discord.RichEmbed()
            .setColor('RANDOM')
            .setAuthor(message.author.tag, message.author.displayAvatarURL)
            .setFooter(`Message Received - FallenTheTaco Lab`)
            .setDescription(message.content)
        client.users.get(support.targetID)
            .send(embed);
        message.delete({
            timeout: 10000
        });
        embed.setFooter(`Message Sent -- ${supportUser.tag}`)
            .setDescription(message.content);
        return message.channel.send(embed);
    }
    if (message.channel.type === "dm") return;
=        let prefix = false
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
        if (command.isOwner() && (!this.Client.owners || !this.Client.owners.includes(message.author.id))) return message.reply('Sorry, you can'\'t use this command because the owner disabled it.')
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
