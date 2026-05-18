# Dice Room

A tiny web page where friends join a shared room and roll 1&ndash;100 for loot, WoW-style. Highest roll wins.

Static HTML/CSS/JS &mdash; hosts on GitHub Pages. Real-time sync is peer-to-peer over WebRTC, via [Trystero](https://github.com/dmotz/trystero). No backend, no accounts, no API keys.

## How it works

When you create or join a room, your browser joins a Trystero room with the same code. Trystero uses public BitTorrent trackers to discover other peers in the room, then opens direct WebRTC connections between everyone. Rolls are broadcast peer-to-peer.

**Caveats:**
- Room state lives in open tabs. If everyone closes the page, rolls are gone. Reopening the same room code starts a fresh slate.
- Discovery takes a few seconds. After your friend opens the link, give it 5&ndash;20 seconds for the connection to come up.
- On heavily restricted networks (some corporate WiFi), WebRTC or BitTorrent trackers may be blocked. See "Switching transport" below if that happens.

## Deploy to GitHub Pages

```bash
git add .
git commit -m "Dice room"
git push
```

Then on GitHub: **Settings &rarr; Pages &rarr; Source: Deploy from a branch &rarr; Branch: `main` / `/ (root)`** &rarr; Save.

After a minute your app is live at `https://<your-username>.github.io/dice-room/`.

## Using it

1. Open the page, enter your name, click **Create new room**.
2. Share the URL (it contains the room code in the `#` hash) with friends.
3. Everyone clicks **ROLL 1&ndash;100**. The list updates live as peers send their rolls. Highest is on top with a gold border.
4. **Clear all rolls** broadcasts a reset to everyone in the room.

## Local development

ES modules need HTTP, not `file://`. From this folder:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Open http://localhost:8000. To test multi-peer locally, open two tabs (one in normal mode, one in incognito so they get different peer identities) and use the same room code.

## Switching transport

If BitTorrent trackers are blocked on your network, you can switch Trystero to a different strategy by changing one line at the top of [app.js](app.js):

```js
import { joinRoom, selfId } from "https://esm.sh/trystero@0.20.0/torrent";
```

Replace `/torrent` with:

- `/nostr` &mdash; uses public Nostr relays for peer discovery
- `/mqtt` &mdash; uses public MQTT brokers
- `/ipfs` &mdash; uses IPFS pubsub

All four are zero-config. If one is flaky for your group, try another.

## Files

- [`index.html`](index.html) &mdash; markup for the landing screen and the room
- [`style.css`](style.css) &mdash; styles
- [`app.js`](app.js) &mdash; routing, Trystero room, roll logic
