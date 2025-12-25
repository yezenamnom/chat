"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Copy, Plus, Trash2, Eye, EyeOff, Key, Home } from "lucide-react"
import Link from "next/link"
import { generateApiKey, maskApiKey, saveApiKeys, loadApiKeys, type ApiKey } from "@/lib/api-key-generator"

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    setApiKeys(loadApiKeys())
  }, [])

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return

    const newKey: ApiKey = {
      id: Date.now().toString(),
      key: generateApiKey(),
      name: newKeyName,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      usage: 0,
      active: true,
    }

    const updatedKeys = [...apiKeys, newKey]
    setApiKeys(updatedKeys)
    saveApiKeys(updatedKeys)
    setGeneratedKey(newKey.key)
    setNewKeyName("")
  }

  const handleDeleteKey = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المفتاح؟ لا يمكن التراجع عن هذا الإجراء.")) return

    const updatedKeys = apiKeys.filter((k) => k.id !== id)
    setApiKeys(updatedKeys)
    saveApiKeys(updatedKeys)
  }

  const toggleKeyVisibility = (id: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(id)) {
      newVisible.delete(id)
    } else {
      newVisible.add(id)
    }
    setVisibleKeys(newVisible)
  }

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const closeGeneratedDialog = () => {
    setGeneratedKey(null)
    setIsCreateDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Key className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">AI API Keys</h1>
            </div>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            إنشاء مفتاح جديد
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">إدارة مفاتيح API</h2>
          <p className="text-muted-foreground">
            قم بإنشاء وإدارة مفاتيح API الخاصة بك للوصول إلى خدمات الذكاء الاصطناعي
          </p>
        </div>

        {/* API Keys Grid */}
        {apiKeys.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Key className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مفاتيح API</h3>
              <p className="text-muted-foreground text-center mb-4">
                ابدأ بإنشاء مفتاح API الأول للوصول إلى خدمات الذكاء الاصطناعي
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                إنشاء مفتاح API
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {apiKeys.map((key) => (
              <Card key={key.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {key.name}
                        {key.active ? (
                          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500">
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
                            معطل
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        تم الإنشاء: {new Date(key.createdAt).toLocaleDateString("ar-SA")}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* API Key Display */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
                        {visibleKeys.has(key.id) ? key.key : maskApiKey(key.key)}
                      </div>
                      <Button variant="outline" size="icon" onClick={() => toggleKeyVisibility(key.id)}>
                        {visibleKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(key.key, key.id)}>
                        {copiedKey === key.id ? <span className="text-xs">✓</span> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">الاستخدام: </span>
                        <span className="font-semibold">{key.usage}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">آخر استخدام: </span>
                        <span className="font-semibold">
                          {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString("ar-SA") : "لم يُستخدم بعد"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Documentation Section */}
        <Card className="mt-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>كيفية استخدام مفاتيح API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. إنشاء مفتاح API</h4>
              <p className="text-sm text-muted-foreground">
                انقر على "إنشاء مفتاح جديد" وقم بتسمية المفتاح حسب الاستخدام المخصص له
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. نسخ المفتاح</h4>
              <p className="text-sm text-muted-foreground">احفظ المفتاح في مكان آمن، يمكنك نسخه باستخدام زر النسخ</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3. استخدام المفتاح في الطلبات</h4>
              <div className="rounded-md bg-muted p-3 font-mono text-xs mt-2">
                <code>
                  {`curl https://api.example.com/v1/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello"}'`}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Create Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء مفتاح API جديد</DialogTitle>
            <DialogDescription>أدخل اسماً وصفياً لمفتاح API لتتمكن من تمييزه لاحقاً</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">اسم المفتاح</Label>
              <Input
                id="keyName"
                placeholder="مثال: مفتاح التطوير"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>
              إنشاء المفتاح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Key Dialog */}
      <Dialog open={!!generatedKey} onOpenChange={closeGeneratedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تم إنشاء المفتاح بنجاح!</DialogTitle>
            <DialogDescription>احفظ هذا المفتاح في مكان آمن. لن تتمكن من رؤيته مرة أخرى بهذا الشكل</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md border border-border bg-muted p-4">
              <p className="text-xs text-muted-foreground mb-2">مفتاح API الخاص بك:</p>
              <p className="font-mono text-sm break-all">{generatedKey}</p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (generatedKey) {
                  copyToClipboard(generatedKey, "new")
                }
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              نسخ المفتاح
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={closeGeneratedDialog}>فهمت، إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
