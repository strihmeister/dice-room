# Dice Room

A tiny web page where friends join a shared room and roll 1&ndash;100 for loot, WoW-style. Highest roll wins.

Static HTML/CSS/JS hosted on GitHub Pages. Real-time sync uses Firebase Realtime Database (free tier &mdash; no credit card needed).

---

## One-time Firebase setup (~5 minutes)

Need a Google account.

### 1. Create a Firebase project

1. Go to https://console.firebase.google.com/ and sign in.
2. Click **Create a project** (or **Add project**).
3. **Project name:** anything, e.g. `dice-room`. Click **Continue**.
4. **Google Analytics:** toggle it **off** &mdash; you don't need it. Click **Create project**.
5. Wait ~20 seconds, then click **Continue**.

### 2. Enable the Realtime Database

This is the part that stores rolls. (Don't confuse it with "Firestore" &mdash; they're different products.)

1. Left sidebar: **Build &rarr; Realtime Database**.
2. Click **Create Database**.
3. **Region:** pick the one closest to you. Click **Next**.
4. Choose **Start in test mode** &rarr; **Enable**.

You'll land on the data tree. The URL at the top is your `databaseURL` &mdash; you'll need it in step 4. It looks like:
`https://dice-room-xxxxx-default-rtdb.europe-west1.firebasedatabase.app/`

### 3. Register a web app

1. Click the gear icon (top-left, next to "Project Overview") &rarr; **Project settings**.
2. Scroll to **Your apps**. Click the `</>` (web) icon.
3. **Nickname:** anything, e.g. `dice-room-web`. **Do NOT** check "Also set up Firebase Hosting".
4. Click **Register app**.

You'll see a snippet like:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "dice-room-xxxxx.firebaseapp.com",
  projectId: "dice-room-xxxxx",
  storageBucket: "dice-room-xxxxx.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123...:web:abc..."
};
```

Keep this tab open. Click **Continue to console** when done copying.

### 4. Paste config into [firebase-config.js](firebase-config.js)

Open [`firebase-config.js`](firebase-config.js) and replace each `"YOUR_..."` value with the matching one from Firebase.

**Important:** the snippet Firebase shows you usually doesn't include `databaseURL`. Add it manually from step 2 above. Final file:

```js
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "dice-room-xxxxx.firebaseapp.com",
  databaseURL: "https://dice-room-xxxxx-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "dice-room-xxxxx",
  storageBucket: "dice-room-xxxxx.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123...:web:abc..."
};
```

### 5. Commit and push

```bash
git add firebase-config.js
git commit -m "Configure Firebase"
git push
```

GitHub Pages redeploys in ~30&ndash;60 seconds. Refresh the live URL &mdash; the red warning banner should disappear, and rooms now sync.

---

## Using it

1. Open the page, enter your name, click **Create new room**.
2. Share the URL with friends (it contains the room code in the `#` hash).
3. Everyone clicks **Roll 1&ndash;100**. Highest is on top with a gold border.
4. **Clear all rolls** resets the room.

## Local development

ES modules need HTTP, not `file://`. From this folder:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Open http://localhost:8000.

## Security rules (recommended)

Firebase's default "test mode" rules allow anyone with your project ID to read/write everything, and they expire after 30 days. Tighten them via **Realtime Database &rarr; Rules**:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "$roomId.matches(/^[A-Z0-9]{4,8}$/)",
        ".write": "$roomId.matches(/^[A-Z0-9]{4,8}$/)",
        "rolls": {
          "$rollId": {
            ".validate": "newData.hasChildren(['name','value','timestamp']) && newData.child('value').isNumber() && newData.child('value').val() >= 1 && newData.child('value').val() <= 100 && newData.child('name').isString() && newData.child('name').val().length <= 20"
          }
        }
      }
    }
  }
}
```

Still allows anonymous read/write (no login), but restricts the shape of data and the room-code format.

## Files

- [`index.html`](index.html) &mdash; markup
- [`style.css`](style.css) &mdash; styles
- [`app.js`](app.js) &mdash; routing, Firebase listener, roll logic
- [`firebase-config.js`](firebase-config.js) &mdash; your project credentials (edit this)
