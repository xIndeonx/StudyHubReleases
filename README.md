# StudyHub

A study tool for HSLU courses that runs on your own computer: it turns ILIAS slides and lecture recordings into notes, handouts,
flashcards and a deadline list.

## Install

Download the file for your computer from the [latest release](../../releases/latest):

| Computer | File | Then |
|---|---|---|
| Windows 10 or 11 | `StudyHub-Setup.exe` | Edge: the three dots beside the download, Keep, Show more, Keep anyway. Then "Windows protected your PC": More info, Run anyway. |
| Mac with Apple silicon, macOS 14 or later | `StudyHub-macOS.zip` | Open StudyHub once and press Done, then System Settings, Privacy & Security, Open Anyway. On macOS 14: Control-click, Open. |
| Linux (Ubuntu 24.04 or similar) | `studyhub-linux-x86_64.tar.gz` | `tar -xf studyhub-linux-x86_64.tar.gz && ./studyhub/install.sh` |

StudyHub is not signed with a paid certificate, which is why your computer warns once. With Smart App Control on, Windows lets no
unsigned program run at all. Your data goes to a StudyHub folder in your home folder. StudyHub updates itself: each update is
signed, and StudyHub checks the signature before it takes anything of it.

## This repository

It holds releases only. Each one has the code (`studyhub-<version>.zip`), its manifest `latest.json` with the manifest's signature
`latest.json.sig`, and the three installers, which `.github/workflows/packages.yml` builds from the code once a release is uploaded.
