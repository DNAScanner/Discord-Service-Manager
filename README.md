# Discord Service Manager for Linux by DNA

This is a [Deno](https://deno.com) script, which allows you to manage the services on your Linux machine with ease

⚠️ **Note:** This script is required to be run as root, as it uses `systemctl` to manage the services

## Screenshots

![alt text](docs/1.svg)
![alt text](docs/2.svg)
![alt text](docs/3.svg)

## Setup

1. Clone the repository
2. Install [Deno](https://deno.com/)
3. Rename `env.template` to `.env` and fill in the required fields
4. Run `deno run -A main.ts`
