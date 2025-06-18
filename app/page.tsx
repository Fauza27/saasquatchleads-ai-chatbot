"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

type SourceDocument = {
  _id: string;
  Company: string;
  Website: string;
  Industry: string;
  "Product/Service Category": string;
  "Business Type (B2B, B2B2C)": string;
  "Employees Count": string;
  "Owner's First Name"?: string;
  "Owner's Last Name"?: string;
  "Owner's LinkedIn"?: string;
  "Company LinkedIn"?: string;
};

type Message = {
  role: "user" | "ai";
  content: string;
  sources?: SourceDocument[];
};

const Logo = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-400">
    <title>SaaSquatch Leads</title>
    <path
      fill="currentColor"
      d="M16.939 12.01a.88.88 0 01.011 1.235l-2.185 2.22a.899.899 0 01-1.264 0l-2.196-2.231a.88.88 0 01.01-1.235l.012-.012a.879.879 0 011.235-.01l.888.902.888-.902a.879.879 0 011.235.01l.011.012.155.158zm-7.95-1.25a1.59 1.59 0 00-2.25 2.25l4.37 4.37a.999.999 0 001.41 0l4.37-4.37a1.59 1.59 0 00-2.25-2.25L12 13.19l-2.855-2.855.155-.155zM12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12z"
    />
  </svg>
);

const TypingIndicator = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center space-x-2 bg-slate-800 rounded-2xl px-4 py-3 shadow-md border border-slate-700">
    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
  </motion.div>
);

const SourceCard = ({ source, onDeepDive }: { source: SourceDocument; onDeepDive: (source: SourceDocument) => void }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:bg-slate-700/50 transition-colors duration-300 flex flex-col p-4 space-y-3 border border-slate-700"
    >
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-slate-100 pr-2">{source.Company}</h4>
        <span className="text-xs bg-teal-500/20 text-teal-300 font-medium px-2 py-0.5 rounded-full flex-shrink-0">{source.Industry}</span>
      </div>
      <p className="text-sm text-slate-400 line-clamp-2 flex-grow">{source["Product/Service Category"]}</p>
      <div className="text-xs text-slate-500 flex items-center space-x-4 pt-2 border-t border-slate-700 mt-auto">
        <span>{source["Business Type (B2B, B2B2C)"]}</span>
        <span className="font-semibold">{source["Employees Count"]} Employees</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={source.Website.startsWith("http") ? source.Website : `http://${source.Website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full hover:bg-slate-600 transition-colors"
        >
          Website
        </a>
        {source["Company LinkedIn"] && (
          <a href={source["Company LinkedIn"]} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full hover:bg-slate-600 transition-colors">
            LinkedIn
          </a>
        )}
        <button onClick={() => onDeepDive(source)} className="flex items-center text-xs bg-teal-500/20 text-teal-300 px-3 py-1.5 rounded-full hover:bg-teal-500/30 transition-colors font-semibold">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h.5a1.5 1.5 0 010 3h-.5a1 1 0 00-1 .975V10a2 2 0 11-4 0V8.975a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3h.5a1 1 0 001-1V3.5zM3.5 10a1.5 1.5 0 013 0V11a1 1 0 001 1h1.5a1.5 1.5 0 010 3H7.5a1 1 0 00-1 1v.5a1.5 1.5 0 01-3 0v-.5a1 1 0 00-1-1H3a1.5 1.5 0 010-3h.5a1 1 0 001-1V10zM13.5 10a1.5 1.5 0 013 0V11a1 1 0 001 1h.5a1.5 1.5 0 010 3h-.5a1 1 0 00-1 1v.5a1.5 1.5 0 01-3 0v-.5a1 1 0 00-1-1H13a1.5 1.5 0 010-3h.5a1 1 0 001-1V10z" />
          </svg>
          Deep Dive
        </button>
      </div>
    </motion.div>
  );
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: 'Welcome to Caprae AI Analyst. I\'m ready to help you analyze the prospect database. Try asking something like "Find B2B companies in the software industry" or "Show me startups with fewer than 50 employees".',
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: inputValue };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    const currentInputValue = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInputValue,
          chatHistory: messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response from server.");
      }

      const data = await response.json();
      const aiMessage: Message = { role: "ai", content: data.answer, sources: data.sources };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      const errorMessageText = error instanceof Error ? `Sorry, an error occurred: ${error.message}` : "Sorry, an error occurred while contacting the server. Please try again.";
      const errorMessage: Message = { role: "ai", content: errorMessageText };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepDive = async (source: SourceDocument) => {
    if (isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: `Give me a deep dive analysis of ${source.Company}.`,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyData: source }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get analysis data.");
      }

      const data = await response.json();
      const aiMessage: Message = { role: "ai", content: data.summary, sources: [] };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      const errorText = error instanceof Error ? `An error occurred during research: ${error.message}` : "Failed to connect to the server for analysis.";
      const errorMessage: Message = { role: "ai", content: errorText };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex h-screen flex-col bg-slate-900 font-sans text-slate-200">
        <header className="bg-slate-900/80 backdrop-blur-md p-4 border-b border-slate-700 sticky top-0 z-10 flex items-center space-x-4">
          <Logo />
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Caprae AI Analyst</h1>
            <p className="text-sm text-slate-400">Lead Generation & Analysis Tool</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <AnimatePresence>
              {messages.map((msg, index) => (
                <motion.div key={index} layout initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                  <div className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "ai" && (
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center shadow-md border border-slate-700">
                        <span className="text-teal-400 font-bold text-sm">AI</span>
                      </div>
                    )}
                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 shadow-lg whitespace-pre-wrap ${msg.role === "user" ? "bg-teal-500 text-slate-900 rounded-br-none" : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none"}`}
                    >
                      <ReactMarkdown
                        components={{
                          p: (props) => <p className="mb-2 last:mb-0" {...props} />,
                          div: (props) => <div className="prose prose-sm max-w-none prose-invert prose-p:text-slate-300 prose-headings:text-slate-100 prose-a:text-teal-400" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {msg.role === "ai" && msg.sources && msg.sources.length > 0 && (
                    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="mt-4 ml-11">
                      <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Related Prospects</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {msg.sources.map((source) => (
                          <SourceCard key={source._id} source={source} onDeepDive={handleDeepDive} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <div className="flex justify-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center shadow-md border border-slate-700">
                  <span className="text-teal-400 font-bold text-sm">AI</span>
                </div>
                <TypingIndicator />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="border-t border-slate-700 bg-slate-900/80 backdrop-blur-md p-4 sticky bottom-0">
          <div className="mx-auto max-w-3xl">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about a prospect..."
                className="w-full rounded-full border border-slate-600 bg-slate-700 text-slate-200 placeholder:text-slate-400 px-5 py-3 pr-14 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-teal-500 p-2.5 text-white transition-colors hover:bg-teal-600 disabled:bg-slate-600 disabled:cursor-not-allowed"
                disabled={isLoading || !inputValue.trim()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </form>
          </div>
        </footer>
      </div>
    </>
  );
}
