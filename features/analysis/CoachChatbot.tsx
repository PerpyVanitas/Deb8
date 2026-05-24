"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { type UIMessage } from "ai"
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CoachChatbot({ analysis, motion }: { analysis: any, motion: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [input, setInput] = useState("")

  const { messages, sendMessage, status } = useChat({
    api: '/api/chat',
    body: { analysis, motion }
  })
  
  const isLoading = status === 'submitted' || status === 'streaming'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    sendMessage({ 
      messages: [...messages, { id: crypto.randomUUID(), role: 'user', content: input } as UIMessage] 
    })
    setInput("")
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 p-0 flex items-center justify-center bg-primary text-primary-foreground"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[500px] shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 border-border">
      <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0 rounded-t-lg">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-5 h-5" /> 
          Debate Coach AI
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary/90 rounded-full" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col h-full bg-background overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm my-8">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Ask me anything about your speech, appeal a score, or request a drill!</p>
            </div>
          )}
          
          {messages.map((m: UIMessage) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`text-sm px-4 py-2 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
                m.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-muted text-foreground rounded-tl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-muted text-foreground">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="p-3 border-t bg-card flex gap-2">
          <Input 
            value={input} 
            onChange={handleInputChange} 
            placeholder="Type your message..." 
            className="flex-1 focus-visible:ring-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="shrink-0">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
