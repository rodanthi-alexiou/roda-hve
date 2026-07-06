import { useRef, useState } from "react";
import { sendChat } from "./api.ts";
import type { ArtworkCard, ChatTurn } from "./types.ts";
import "./App.css";

interface Message extends ChatTurn {
  cards?: ArtworkCard[];
}

const SUGGESTIONS = [
  "Plan a 30-minute tour of Impressionist landscapes",
  "Show me public-domain Egyptian art",
  "Find works similar to Van Gogh's sunflowers",
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const fileInput = useRef<HTMLInputElement>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    setError(undefined);
    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const attachedImage = image;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setImage(undefined);
    setLoading(true);

    try {
      const res = await sendChat(message, history, attachedImage);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply, cards: res.cards },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setImage(await fileToDataUrl(file));
  }

  const cards = messages.flatMap((m) => m.cards ?? []);

  return (
    <div className="app">
      <header className="header">
        <h1>Museum Sidekick</h1>
        <p>Your guide to the Met's open-access collection.</p>
      </header>

      <div className="layout">
        <section className="chat">
          <div className="messages">
            {messages.length === 0 && (
              <div className="empty">
                <p>Ask me anything about the collection. Try:</p>
                <div className="suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="bubble assistant loading">Thinking…</div>}
            {error && <div className="bubble error">{error}</div>}
          </div>

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            {image && (
              <div className="attachment">
                <img src={image} alt="attachment preview" />
                <button type="button" onClick={() => setImage(undefined)}>
                  ×
                </button>
              </div>
            )}
            <div className="composer-row">
              <button
                type="button"
                className="icon"
                title="Attach an image"
                onClick={() => fileInput.current?.click()}
              >
                📷
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickImage}
              />
              <input
                className="text"
                value={input}
                placeholder="Ask about a work, artist, or theme…"
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="send" type="submit" disabled={loading}>
                Send
              </button>
            </div>
          </form>
        </section>

        <aside className="gallery">
          {cards.length === 0 ? (
            <p className="gallery-empty">Artworks will appear here.</p>
          ) : (
            <div className="grid">
              {cards.map((c) => (
                <a
                  key={c.objectID}
                  className="card"
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img src={c.thumbnail || c.image} alt={c.title} loading="lazy" />
                  <div className="card-body">
                    <strong>{c.title}</strong>
                    <span>{c.artist || "Unknown artist"}</span>
                    <span className="muted">{c.date}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
