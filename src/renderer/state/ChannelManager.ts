import {ConnectionManager} from "./ConnectionManager";
import {ChatManager} from "./ChatManager";

export type Channel = {
    name: string,
    topic: string | null,
    users: number | null
}

export type CurrentChannelSubscription = (channel: Channel) => void
export type ChannelListSubscription = (channels: Channel[]) => void

export namespace ChannelManager {
    let currentChannel: Channel | null = null
    let channels: Channel[] = []
    let currentChannelSubscriptions: CurrentChannelSubscription[] = []
    let channelListSubscriptions: ChannelListSubscription[] = []

    listen()

    export function subscribeCurrent(callback: CurrentChannelSubscription) {
        currentChannelSubscriptions.push(callback)
    }
    export function subscribeList(callback: ChannelListSubscription) {
        channelListSubscriptions.push(callback)
    }

    function dispatchCurrent(){
        if (currentChannel == null) return;
        // @ts-ignore
        currentChannelSubscriptions.forEach((s) => s(currentChannel))
    }
    function dispatchList(){
        channelListSubscriptions.forEach((s) => s(channels))
    }

    let counter = 0
    function listen() {
        ConnectionManager.subscribe(() => channels = [])

        window.electron.ipcRenderer.on('messages', (arg) => {
            // @ts-ignore
            let string = new TextDecoder().decode(arg);
            let messages = string.split("\r\n")

            messages.forEach((message) => {
                let fields = message.split(" ");
                let code = fields[0]
                let innerMessage: string = ""

                switch (code) {
                    case "1007": // joined channel
                        innerMessage = message.split("\"")[1].trim()
                        currentChannel = {
                            name: innerMessage,
                            topic: "",
                            users: 0
                        }
                        console.log(currentChannel)
                        dispatchCurrent()
                        if (currentChannel.name == "Chat") {
                            ChatManager.ignoreInfo = true
                            window.electron.ipcRenderer.sendMessage("chat", "/channels");
                        }
                        break;
                    case "1018": // info
                        innerMessage = message.split("\"")[1].trim()
                        if (innerMessage.startsWith("Listing ") && innerMessage.endsWith(" channels:")) {
                            counter = Number(innerMessage.slice(8, 9))
                            channels = []
                        } else if (counter > 0) {
                            let tokens = innerMessage.split("|")
                            channels.push({
                                name: tokens[0].trim(),
                                topic: tokens[3].trim(),
                                users: Number(tokens[1].trim())
                            })
                            dispatchList()
                            counter--

                            if (counter == 0) {
                                ChatManager.ignoreInfo = false
                            }
                        }
                        //dispatch()
                        break;
                }
            })
        })
    }
}