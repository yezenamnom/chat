"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Download, FileText, FileJson, Link2, Check } from "lucide-react"
import { useState } from "react"
import { exportToText, exportToMarkdown, exportToJSON, downloadFile, generateShareableLink } from "@/lib/export-utils"

interface ExportDialogProps {
  messages: any[]
  trigger?: React.ReactNode
}

export function ExportDialog({ messages, trigger }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleExportText = () => {
    const content = exportToText(messages)
    const date = new Date().toLocaleDateString("ar-SA").replace(/\//g, "-")
    downloadFile(content, `chat-${date}.txt`, "text/plain;charset=utf-8")
  }

  const handleExportMarkdown = () => {
    const content = exportToMarkdown(messages)
    const date = new Date().toLocaleDateString("ar-SA").replace(/\//g, "-")
    downloadFile(content, `chat-${date}.md`, "text/markdown;charset=utf-8")
  }

  const handleExportJSON = () => {
    const content = exportToJSON(messages)
    const date = new Date().toLocaleDateString("ar-SA").replace(/\//g, "-")
    downloadFile(content, `chat-${date}.json`, "application/json;charset=utf-8")
  }

  const handleCopyLink = async () => {
    try {
      const link = generateShareableLink(messages)
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تصدير المحادثة</DialogTitle>
          <DialogDescription>اختر صيغة التصدير المناسبة لك</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleExportText}>
            <FileText className="w-4 h-4 ml-2" />
            تصدير كملف نصي (.txt)
          </Button>

          <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleExportMarkdown}>
            <FileText className="w-4 h-4 ml-2" />
            تصدير كـ Markdown (.md)
          </Button>

          <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleExportJSON}>
            <FileJson className="w-4 h-4 ml-2" />
            تصدير كـ JSON (.json)
          </Button>

          <div className="border-t pt-3">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={handleCopyLink}
              disabled={linkCopied}
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4 ml-2" />
                  تم نسخ الرابط
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 ml-2" />
                  نسخ رابط المشاركة
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
