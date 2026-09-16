import express from "express";
import path from "node:path";

const app = express();
const port = Number(process.env.PAGES_PREVIEW_PORT || 4173);
const root = path.resolve(process.env.PAGES_CLIENT_OUT_DIR || "dist/pages");
const base = (process.env.PAGES_BASE_PATH || "/sunzi-art-of-war/").replace(/\/+$/, "");

app.use(base, express.static(root, { extensions: ["html"] }));
app.use((_req, res) => res.status(404).sendFile(path.join(root, "404.html")));
app.listen(port, "0.0.0.0", () => console.log(`GitHub Pages preview port ${port}`));
