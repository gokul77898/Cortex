import { useState, useEffect, useRef } from "react";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: number;
  content: string;
  isUser: boolean;
}

interface UploadedFile {
  name: string;
  content: string;
  type: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const addMessage = (content: string, isUser: boolean) => {
    setMessages((prev) => [...prev, { id: Date.now(), content, isUser }]);
  };

  const handleSend = async (message: string, files?: File[]) => {
    addMessage(message, true);
    setIsLoading(true);

    let prompt = message;
    if (uploadedFiles.length > 0 || (files && files.length > 0)) {
      const fileContext = uploadedFiles
        .map((f) => `--- ${f.name} ---\n${f.content}`)
        .join("\n\n");
      prompt = `Files:\n${fileContext}\n\nQuestion: ${message}`;
    }

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        addMessage(`Error: ${response.statusText}`, false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        addMessage("No response", false);
        return;
      }

      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
      }

      const lines = fullResponse.split("\n\n");
      let responseText = "";
      for (const line of lines) {
        const match = line.match(/data: (.+)/);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            if (data.text) responseText += data.text;
          } catch {}
        }
      }

      addMessage(responseText || "No response", false);
      setUploadedFiles([]);
    } catch (err) {
      addMessage(`Error: ${err}`, false);
    }

    setIsLoading(false);
  };

  const formatContent = (text: string) => {
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Handle code blocks with language and copy button
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'code';
      return `<div class="code-block">
        <div class="code-header">
          <span class="code-lang">${language}</span>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent)">Copy</button>
        </div>
        <pre><code>${code.trim()}</code></pre>
      </div>`;
    });
    
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    
    // Line breaks
    text = text.replace(/\n/g, "<br>");
    
    return text;
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* 3D Canvas Background */}
      <CanvasBackground />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen max-w-4xl mx-auto p-4 gap-4">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center justify-between px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ y: [0, -3, 0], rotate: [0, 2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#007AFF] via-[#5E5CE6] to-[#BF5AF2] flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30"
            >
              🧠
            </motion.div>
            <span className="text-xl font-semibold tracking-tight">GOKUL-CORTEX</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5">
            <span className="w-2 h-2 rounded-full bg-[#30D158] shadow-[0_0_8px_#30D158]" />
            <span className="text-sm text-white/60">Groq GPT-OSS 120B</span>
          </div>
        </motion.header>

        {/* Chat Container */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
        >
          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-5"
          >
            <AnimatePresence>
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-20"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#007AFF] via-[#5E5CE6] to-[#BF5AF2] flex items-center justify-center text-5xl mb-6 shadow-xl shadow-blue-500/30"
                  >
                    ✨
                  </motion.div>
                  <h2 className="text-2xl font-semibold mb-2">Welcome to GOKUL-CORTEX</h2>
                  <p className="text-white/50 max-w-sm">
                    Upload documents and ask anything — code, files, explanations, analysis
                  </p>
                </motion.div>
              )}
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex gap-4 ${msg.isUser ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-lg ${
                      msg.isUser
                        ? "bg-gradient-to-br from-[#007AFF] to-[#5E5CE6]"
                        : "bg-white/10 border border-white/10"
                    }`}
                  >
                    {msg.isUser ? "👤" : "🧠"}
                  </div>
                  <div
                    className={`max-w-[75%] px-5 py-4 rounded-2xl text-[15px] leading-relaxed ${
                      msg.isUser
                        ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20"
                        : "bg-white/10 border border-white/10"
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  />
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                    🧠
                  </div>
                  <div className="flex gap-1.5 px-5 py-4 bg-white/10 border border-white/10 rounded-2xl">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                        className="w-2 h-2 rounded-full bg-[#007AFF]"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <PromptInputBox
              onSend={handleSend}
              isLoading={isLoading}
              placeholder="Ask anything..."
              className="w-full"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    class Particle3D {
      x: number;
      y: number;
      z: number;
      size: number;
      speedX: number;
      speedY: number;
      speedZ: number;
      hue: number;
      opacity: number;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.z = Math.random() * 100;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.speedZ = (Math.random() - 0.5) * 0.1;
        this.hue = Math.random() * 40 + 200;
        this.opacity = Math.random() * 0.4 + 0.1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.z += this.speedZ;

        if (
          this.x < 0 ||
          this.x > canvas!.width ||
          this.y < 0 ||
          this.y > canvas!.height ||
          this.z < 0 ||
          this.z > 100
        ) {
          this.reset();
        }
      }

      draw() {
        const scale = 1 + this.z / 100;
        const size = this.size * scale;
        const opacity = this.opacity * (1 - this.z / 150);

        ctx!.beginPath();
        ctx!.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${this.hue}, 90%, 65%, ${opacity})`;
        ctx!.fill();

        if (this.z < 30) {
          ctx!.beginPath();
          ctx!.arc(this.x, this.y, size * 3, 0, Math.PI * 2);
          const gradient = ctx!.createRadialGradient(
            this.x,
            this.y,
            0,
            this.x,
            this.y,
            size * 3
          );
          gradient.addColorStop(
            0,
            `hsla(${this.hue}, 90%, 65%, ${opacity * 0.3})`
          );
          gradient.addColorStop(1, "transparent");
          ctx!.fillStyle = gradient;
          ctx!.fill();
        }
      }
    }

    const particles: Particle3D[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push(new Particle3D());
    }

    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dz = particles[i].z - particles[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 100) {
            const opacity =
              (1 - dist / 100) *
              0.15 *
              (1 - Math.max(particles[i].z, particles[j].z) / 100);
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(0, 122, 255, ${opacity})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
    }

    let time = 0;
    function animate() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 0.008;

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      drawConnections();

      const gradient = ctx.createRadialGradient(
        canvas.width * (0.5 + Math.sin(time * 0.5) * 0.2),
        canvas.height * (0.5 + Math.cos(time * 0.3) * 0.2),
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.8
      );
      gradient.addColorStop(0, "rgba(0, 122, 255, 0.04)");
      gradient.addColorStop(0.5, "rgba(94, 92, 230, 0.02)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
    />
  );
}

export default App;