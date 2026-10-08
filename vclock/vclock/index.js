const VoiceActions = Webpack.getModule(m =>
    typeof m?.selectVoiceChannel === "function" &&
    typeof m?.disconnect === "function"
);
const Dispatcher      = Webpack.getModule(m => m.dispatch && m.subscribe);
const UserStore       = Webpack.getStore("UserStore");
const VoiceStateStore = Webpack.getStore("VoiceStateStore");
const ChannelStore    = Webpack.getStore("ChannelStore");

const LOCKED_CHANNEL_ID = "1516605858660880484";

let locked        = true;
let userInitiated = false;

const ch         = ChannelStore?.getChannel?.(LOCKED_CHANNEL_ID);
const lockedName = ch?.name ?? LOCKED_CHANNEL_ID;

function onVoiceStateUpdate({ userId, channelId }) {
    if (!locked || userInitiated) return;
    const me = UserStore.getCurrentUser();
    if (!me || userId !== me.id) return;
    if (channelId === LOCKED_CHANNEL_ID) return;
    if (!channelId) {
        setTimeout(() => {
            try { VoiceActions.selectVoiceChannel(LOCKED_CHANNEL_ID); } catch(e) {}
        }, 800);
    }
}

export default {
    name:        "VCLock",
    description: "Locks you to a VC channel. Restart app to leave.",
    version:     "2.1.0",
    authors:     [{ name: "dj" }],

    start() {
        Patcher.instead("VCLock-dc", VoiceActions, "disconnect", (that, args, orig) => {
            if (!locked) return orig.apply(that, args);
            userInitiated = true;
            showToast(`🔒 Locked to #${lockedName} — restart app to leave`, { type: "warning" });
            userInitiated = false;
        });

        Patcher.instead("VCLock-select", VoiceActions, "selectVoiceChannel", (that, args, orig) => {
            const [channelId] = args;
            if (!locked) return orig.apply(that, args);
            if (channelId === LOCKED_CHANNEL_ID) return orig.apply(that, args);
            userInitiated = true;
            showToast(`🔒 Locked to #${lockedName} — restart app to leave`, { type: "warning" });
            userInitiated = false;
        });

        Dispatcher.subscribe("VOICE_STATE_UPDATE", onVoiceStateUpdate);
        showToast(`🔒 VCLock active — #${lockedName}`, { type: "success" });
    },

    stop() {
        Patcher.unpatchAll("VCLock-dc");
        Patcher.unpatchAll("VCLock-select");
        Dispatcher.unsubscribe("VOICE_STATE_UPDATE", onVoiceStateUpdate);
        locked = false;
    },
};
