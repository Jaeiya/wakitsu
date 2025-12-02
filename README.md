# Project Deprecation Notice

This project was a proof of concept to see if using JavaScript for a TUI application was applicable... and it turns out it worked very well. However I've since moved onto a lower level programming language (Golang) and decided to re-write this application. That being said, the evolution of this project will continue at the link below.

Check it out: https://github.com/jaeiya/koshime

# About

Wakitsu is a TUI application designed to find an anime episode on disk, at the working directory. It will try to discover any FanSubbed file names. If found, it will update your [Kitsu] watch list and move the file to a "watched" folder. Not all FanSub file names are supported, since there is unfortunately no standardized naming practice among the groups.

You can also use the manual flag `-m` or `-manual` to update an anime without needing a file on disk, but this is not the standard way to use the program.

> This is a Hobby project created out of a need for both relaxation and organization.

I don't know how many people out there have this specific use-case, but I was really bad at updating my progress on [Kitsu], so I figured if I could make it dead simple through command line, I'd actually keep up with it. As it turns out, I haven't missed a single progress update since.

If you're like me and find the CLI a lot more user-friendly than going to a website, then this program might be for you!

## Getting Started

### Easy Global Install

The following will install a production-only version of the program that you can start using immediately.

```powershell
npm i -g wakitsu --omit=dev
```

### Command Documentation

Every possible command is documented internally through the help command. Unless you want to examine the code, the following command is all you need to get started using the program:

```powershell
wak -h
wak --help
```

## Development Installation

Clone this repository and then run the following command in the directory where you cloned it.

```bash
npm i
```

**Important!!**

After installation, make sure you create or execute a TypeScript build task using the root [tsconfig](/tsconfig.json) file. This is because the `./bin` directory needs to be populated before any of the following commands will work.

VSCODE users can simply execute the `Run Build Task` command (or by using the corresponding keyboard shortcut) and it should automatically popup with an option to build or watch the `tsconfig` file. The default keybinding is `Ctrl+Shift+B`.

### Run in dev mode

```powershell
npm run dev
```

### Install Globally

```powershell
npm -g i .
```

[kitsu]: https://kitsu.app
