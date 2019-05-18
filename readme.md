# Counter-Bot

A multi-purpose Discord bot that tracks and recites quotes, lists, logs events and reports statistics of those events for each user, charts those events, generates primitive sentences from a malleable vocabulary, and much more.
Consult the "!help" command for a relatively comprehensive list of command-invoked features. The printout of this command (in unprocessed form) is in `helpfile`

## Getting Started

These instructions will allow you to set up the bot node server on a machine and let it connect to Discord servers to which it is invited to.

### Prerequisites

It is assumed that python 3.x is installed on the machine and can be invoked via `python3`.

### Installation

First, ensure that `nodejs`, `npm`, and `python3-pip` are available on the system:

```
sudo apt install -y nodejs npm python3-pip
```

Install matplotlib if not already installed; it is used for generating event log charts (`!chart`):

```
python3 -mpip install matplotlib
```

Clone this repository:

```
git clone https://github.com/andreyryabtsev/counter_bot.git && cd counter_bot
```

Install the `discord.js` and any other dependencies:

```
npm install
```

## Running the bot

### Copy/modify files

The bot uses three files presently, listed below. Run this to copy the defaults and modify them according to your needs.
```
cp -i ./defaults/* .
```

1. `auth.json`
    * This JSON stores the authentication key provided to your bot account by discord for sign-in. Open this file and replace `YOUR_TOKEN_HERE` with your actual token.

2. `config.json`
    * This JSON contains the configuration of your bot, such as the text of error and success messages, as well as the text of certain commands and pre-defined responses. For instance, the default event log command can be seen in this snippet:
    ```json
    "log_command": "animal",
    "log_response": "Thank you {u}, I have logged your animal product usage."
    ```
    So by defualt, you are ready to use the logging feature to track your path towards veganism, as an example. Additionally, `{u}` is a placeholder, in this case it is replaced by the logging user's current display name on the server. Adjust the config to your liking and use cases.

3. `save.json`
    * This file stores all the information accumulated by the bot for functioning. It should generally not need manual modification, although sometimes you may want to alter it after the bot has been functioning for a while. Upcoming features include a migration to a relational database and the addition of a server-side administrative console for convenient modifications to data that do not warrant `!` in-Discord commands, so stay tuned for the bot to become more performant, greater ease of data editing, and better experience for the hoster.

### Scripts

The repository includes three BASH executable scripts:
1. `start` launches the bot and redirects the output (every posted message, some debug information, and errors) to `log.txt` and `errorlog.txt`, for later examination. If you experience issues please use the relevant contents of these two files to report them. Additionally, the process is detached and its PID is saved to `pid` file for tracking. The bot will not start if it is already running (per the presence of `pid`) and will inform you of the issue.
2. `stop` reads the `pid` file created by `start` and kills the bot's process, deleting the file. If the file is not found it will inform you.
3. `restart` simply executes `stop` and `start` consecutively. It is useful when pulling in an update and wanting to restart or to verify that there is no running instance when starting (for the latter reason `start` should rarely be used on its own).

Assuming no errors, once `start` or `restart` execute, the bot should be up and ready for interaction. Make sure that the needed files are prepared, the auth key is correct, and check the `errorlog.txt` if problems arise.

## Built With

* [node.js](https://nodejs.org/en/) - Lightweight JavaScript server
* [discord.js](https://discord.js.org/#/) - Excellent node module for interacting with the Discord API with ease

## Contributing

Feel free to submit pull requests or feature requests. Also, please report bugs and issues you come across, along with useful data (state of the bot at time of issue and log file excerpts)

## Versioning

The master branch will be kept stable, so can always be cloned to get the newest stable commit. `indev` and major features branches will be added for unstable builds in development process and big changes.

## Authors

* **[Andrey Ryabtsev](ryabtsev@cs.washington.edu)** - *Creator/Developer*

## License

This project is licensed under the MIT License, and is free for all use and modification. Credit is appreciated where appropriate.

## Acknowledgments

* Discord, for providing such an excellent and broad API for highly customizable, fun bots.
