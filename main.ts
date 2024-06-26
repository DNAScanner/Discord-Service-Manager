import {Client, Events} from "npm:discord.js";
import {Routes} from "npm:discord-api-types/v9";
import {} from "npm:@discordjs/brokers";
import {SlashCommandBuilder, ActionRowBuilder, ButtonBuilder} from "npm:@discordjs/builders";
import {} from "npm:@discordjs/collection";
import {} from "npm:@discordjs/core";
import {} from "npm:@discordjs/formatters";
import {} from "npm:@discordjs/proxy";
import {REST} from "npm:@discordjs/rest";
import {} from "npm:@discordjs/voice";
import {} from "npm:@discordjs/util";
import {} from "npm:@discordjs/ws";

import {load} from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import {ButtonStyle} from "npm:discord-api-types/v10";

type AwaitMessageComponentResult = {
	readonly deferUpdate: () => Promise<void>;
	readonly customId: string;
};

const env = await load({export: true});

const rest = new REST().setToken(env.TOKEN);

const client = new Client({intents: []});

client.on(Events.ClientReady, (client) => {
	console.log(`Logged in as ${client.user?.tag}`);

	// Register commands
	(async () => {
		try {
			console.log("Registering commands");

			await rest.put(Routes.applicationCommands(client.user.id), {
				body: [
					new SlashCommandBuilder() //
						.setName("service")
						.setDescription("Manage a specified service")
						.addStringOption((option) =>
							option //
								.setName("service")
								.setDescription("The service to manage")
								.setRequired(true)
						),
				],
			});

			console.log("Commands registered");
		} catch (error) {
			console.error(error);
		}
	})();
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isCommand()) return;

	const {commandName} = interaction;

	switch (commandName) {
		case "service": {
			try {
				const serviceName = interaction.options.get("service")?.value as string;

				if (interaction.user.id !== env.ALLOWED_USER) {
					await interaction.reply({ephemeral: true, content: "You are not allowed to use this command"});
					break;
				}

				const status = await service.getStatus(serviceName);

				if (status === "Service not found") {
					await interaction.reply({ephemeral: true, content: `### Service \`${serviceName}\` not found`});
					break;
				}

				await interaction.reply({content: `### Loading data for service \`${serviceName}\``});

				while (true) {
					const status = await service.getStatus(serviceName);

					const serviceActive = status.includes("Active: active");

					const response = await interaction.editReply({
						content: `### ${serviceActive ? "🟢" : "🔴"} Managing Service \`${serviceName}\`\n\n\`\`\`\n` + status + "\n```",
						components: [
							//
							new ActionRowBuilder() //
								.addComponents(
									new ButtonBuilder() // Update status
										.setStyle(ButtonStyle.Primary)
										.setLabel("Update Status")
										.setCustomId("update")
								)
								.addComponents(
									new ButtonBuilder() // Dismiss
										.setStyle(ButtonStyle.Secondary)
										.setLabel("Dismiss")
										.setCustomId("dismiss")
								),

							new ActionRowBuilder() //
								.addComponents(
									//
									new ButtonBuilder() // Start
										.setStyle(ButtonStyle.Success)
										.setLabel("Start")
										.setCustomId("start")
										.setDisabled(serviceActive),

									new ButtonBuilder() // Stop
										.setStyle(ButtonStyle.Danger)
										.setLabel("Stop")
										.setCustomId("stop")
										.setDisabled(!serviceActive),

									new ButtonBuilder() // Restart
										.setStyle(ButtonStyle.Primary)
										.setLabel("Restart")
										.setCustomId("restart")
										.setDisabled(!serviceActive)
								),
						],
					});

					// deno-lint-ignore no-explicit-any
					const filter = (i: any) => i.user.id === interaction.user.id;

					// Wait for user input
					try {
						const choice = (await response.awaitMessageComponent({
							filter,
							time: 300000,
						})) as AwaitMessageComponentResult;

						await choice.deferUpdate();

						let exit = false;

						switch (choice.customId) {
							case "update": {
								break;
							}

							case "dismiss": {
								await interaction.deleteReply();
								exit = true;
								break;
							}

							case "start": {
								await interaction.editReply({content: `### Starting service \`${serviceName}\`...`});
								await service.start(serviceName);
								break;
							}

							case "stop": {
								await interaction.editReply({content: `### Stopping service \`${serviceName}\`...`});
								await service.stop(serviceName);
								break;
							}

							case "restart": {
								await interaction.editReply({content: `### Restarting service \`${serviceName}\`...`});
								await service.restart(serviceName);
								break;
							}

							default: {
								await interaction.editReply({content: choice.customId + " is not handled yet"});
								break;
							}
						}

						if (exit) break;
					} catch (error) {
						await interaction.editReply({content: "```ts\n" + error + "\n```"});
						break;
					}
				}

				break;
			} catch {
				null;
			}
		}
	}
});

client.login(env.TOKEN);

const service = {
	getStatus: async (serviceName: string): Promise<string> =>
		await new Promise((resolve) => {
			const output = new Deno.Command("systemctl", {args: ["status", serviceName]}).outputSync();

			if (output.code !== 4) {
				resolve(new TextDecoder().decode(output.stdout));
			} else {
				resolve("Service not found");
			}
		}),

	start: async (serviceName: string): Promise<void> =>
		await new Promise((resolve) => {
			new Deno.Command("systemctl", {args: ["start", serviceName]}).outputSync();

			resolve();
		}),

	stop: async (serviceName: string): Promise<void> =>
		await new Promise((resolve) => {
			new Deno.Command("systemctl", {args: ["stop", serviceName]}).outputSync();

			resolve();
		}),

	restart: async (serviceName: string): Promise<void> =>
		await new Promise((resolve) => {
			new Deno.Command("systemctl", {args: ["restart", serviceName]}).outputSync();

			resolve();
		}),
};
