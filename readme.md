# Quote-Bot

A multi-purpose Discord bot that tracks and recites quotes, logs events and reports statistics of those events for each user, visualizes event data, generates primitive sentences from a malleable vocabulary, and much more.
Consult the "!help" command for a relatively comprehensive list of command-invoked features.

## Getting Started

These instructions will allow you to set up the bot node server on a machine and let it connect to Discord servers to which it is invited to.

### Prerequisites

It is assumed that python 3.x is installed on the machine and can be invoked via `python3`.

### Installation

First, ensure that `nodejs`, `npm`, `mysql-server` and `python3-pip` are available on the system:

```
sudo apt install -y nodejs npm python3-pip mysql-server
```

Install matplotlib if not already installed; it is used for generating event log charts (`!chart`):

```
python3 -mpip install matplotlib
```

Clone this repository:

```
git clone https://github.com/andreyryabtsev/quote_bot.git && cd quote_bot
```

Install the `discord.js`, `mysql`, and any other dependencies:

```
npm install
```

Run the initializer script, which updates MySQL settings to support emoji/Unicode, starts a MySQL service, and initializes the bot database with a privilleged local account:
```
sudo ./dbinit
```

## Running the bot

### Copy/modify files

The bot uses two files presently, listed below. Run this to copy the defaults and modify them according to your needs.
```
cp -i ./defaults/* .
```

1. `auth.json`
    * This JSON stores the authentication key provided to your bot account by discord for sign-in. Open this file and replace `YOUR_TOKEN_HERE` with your actual token.

2. `config.json`
    * This JSON contains modifications to the configuration of your bot, such as the text of error and success messages, as well as the text of certain commands and pre-defined responses. Mimic parts of the structure of `default_config.json` to change specific functionality. For instance, the default event log command can be seen in this snippet:
    ```json
    "log_command": "animal",
    "log_response": "Thank you {u}, I have logged your animal product usage."
    ```
    So by default, you are ready to use the logging feature to track your path towards veganism, as an example. Additionally, `{u}` is a placeholder, in this case it is replaced by the logging user's current display name on the server. If you would like to change the log command name and nothing else, you can edit your `config.json` to be:
    ```json
    {
        "logs": {
            "log_command": "log"
        }
    }
    ```
    Now, bot will respond to `!log` instead of to `!animal` for event-logging, but otherwise act no different.

### Scripts

The repository includes three BASH executable scripts:
1. `start` launches the bot and redirects the output (every posted message, some debug information, and errors) to `log.txt` and `errorlog.txt`, for later examination. If you experience issues please use the relevant contents of these two files to report them. Additionally, the process is detached and its PID is saved to `pid` file for tracking. The bot will not start if it is already running (per the presence of `pid`) and will inform you of the issue.
2. `stop` reads the `pid` file created by `start` and kills the bot's process, deleting the file. If the file is not found it will inform you.
3. `restart` simply executes `stop` and `start` consecutively. It is useful when pulling in an update and wanting to restart or to verify that there is no running instance when starting (for the latter reason `start` should rarely be used on its own).

Assuming no errors, once `start` or `restart` execute, the bot should be up and ready for interaction. Make sure that the needed files are prepared, the auth key is correct, and check the `errorlog.txt` if problems arise.

## Built With

* [node.js](https://nodejs.org/en/) - Lightweight JavaScript server
* [discord.js](https://discord.js.org/#/) - Node module for interacting with the Discord API with ease
* [mysql](https://www.npmjs.com/package/mysql) - Bridge from node to MySQL server

## Contributing

Feel free to submit pull requests or feature requests. Also, please report bugs and issues you come across, along with useful data (state of the bot at time of issue and log file excerpts)

## Versioning

The master branch will be kept stable, so can always be cloned to get the newest stable commit. `indev` and major features branches will be added for unstable builds in development process and big changes.

## Authors

* **[Andrey Ryabtsev](mailto:ryabtsev@cs.washington.edu)** - *Creator/Developer*
* **Max Randal** - *Assistant Developer*

## License

This project is licensed under the MIT License, and is free for all use and modification.
