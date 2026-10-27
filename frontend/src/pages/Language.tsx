import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Mic2, Search, Plus, Edit, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import ImportDialog from '@/components/vocabulary/ImportDialog'
import { useVocabulary, useCreateVocabulary, useUpdateVocabulary, useDeleteVocabulary } from '@/services/vocabularyService'
import type { Vocabulary } from '@/types'

const categoryColors: Record<string, string> = {
  'IELTS': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'TOEIC': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'GPA': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'DevOps': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Thông dụng': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Khác': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400',
}

function VocabularyTab() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Vocabulary | null>(null)
  const [search, setSearch] = useState('')
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')
  const [example, setExample] = useState('')
  const [category, setCategory] = useState('Khác')
  const [type, setType] = useState('word')

  const { data: vocab = [], isLoading } = useVocabulary(search || undefined)
  const createVocab = useCreateVocabulary()
  const updateVocab = useUpdateVocabulary()
  const deleteVocab = useDeleteVocabulary()

  function resetForm() {
    setWord(''); setMeaning(''); setExample(''); setCategory('Khác'); setType('word'); setEditing(null)
  }

  function openEdit(v: Vocabulary) {
    setEditing(v); setWord(v.word); setMeaning(v.meaning); setExample(v.example || '')
    setCategory(v.category || 'Khác'); setType(v.type || 'word'); setDialogOpen(true)
  }

  async function handleSave() {
    if (!word.trim() || !meaning.trim()) { toast.error('Nhập từ và nghĩa!'); return }
    if (editing) {
      await updateVocab.mutateAsync({ id: editing.id, word: word.trim(), meaning: meaning.trim(), example: example || null, category, type })
      toast.success('Đã cập nhật')
    } else {
      await createVocab.mutateAsync({ word: word.trim(), meaning: meaning.trim(), example: example || null, category, type })
      toast.success('Đã thêm từ mới')
    }
    setDialogOpen(false); resetForm()
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Tìm từ vựng..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" />Import
        </Button>
        <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true) }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />Thêm từ
        </Button>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={3} /> : vocab.length === 0 ? (
        <EmptyState icon={BookOpen} title="Chưa có từ vựng" description="Thêm từ mới hoặc import file Excel/JSON" action={{ label: 'Thêm từ', onClick: () => { resetForm(); setDialogOpen(true) } }} />
      ) : (
        <div className="grid gap-2">
          {vocab.map(v => (
            <div key={v.id} className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{v.word}</span>
                  {v.type === 'phrase' && <Badge variant="outline" className="text-[10px]">Cụm từ</Badge>}
                  {v.category && <Badge variant="outline" className={`text-[10px] ${categoryColors[v.category] || ''}`}>{v.category}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{v.meaning}</p>
                {v.example && <p className="text-xs text-muted-foreground/60 mt-0.5 italic">"{v.example}"</p>}
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteVocab.mutate(v.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Sửa từ' : 'Thêm từ mới'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Từ</label><Input value={word} onChange={e => setWord(e.target.value)} placeholder="Nhập từ..." /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Nghĩa</label><Input value={meaning} onChange={e => setMeaning(e.target.value)} placeholder="Nhập nghĩa..." /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Ví dụ</label><Textarea value={example} onChange={e => setExample(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><label className="text-sm font-medium">Danh mục</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IELTS">IELTS</SelectItem>
                    <SelectItem value="TOEIC">TOEIC</SelectItem>
                    <SelectItem value="GPA">GPA</SelectItem>
                    <SelectItem value="DevOps">DevOps</SelectItem>
                    <SelectItem value="Thông dụng">Thông dụng</SelectItem>
                    <SelectItem value="Khác">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Loại</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="word">Từ</SelectItem>
                    <SelectItem value="phrase">Cụm từ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Hủy</Button>
            <Button onClick={handleSave} disabled={createVocab.isPending || updateVocab.isPending}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}

function IPATab() {
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [currentGroup, setCurrentGroup] = useState<'consonants' | 'vowels'>('consonants')
  const [studyMode, setStudyMode] = useState(false)
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)

  const CONSONANTS = [
    { symbol: 'p', example: 'pen', desc: 'Vô thanh, môi' },
    { symbol: 'b', example: 'bad', desc: 'Hữu thanh, môi' },
    { symbol: 't', example: 'ten', desc: 'Vô thanh, chân răng' },
    { symbol: 'd', example: 'did', desc: 'Hữu thanh, chân răng' },
    { symbol: 'k', example: 'cat', desc: 'Vô thanh, hàm ếch' },
    { symbol: 'ɡ', example: 'get', desc: 'Hữu thanh, hàm ếch' },
    { symbol: 'f', example: 'fat', desc: 'Vô thanh, răng-môi' },
    { symbol: 'v', example: 'van', desc: 'Hữu thanh, răng-môi' },
    { symbol: 'θ', example: 'thin', desc: 'Vô thanh, liên răng' },
    { symbol: 'ð', example: 'this', desc: 'Hữu thanh, liên răng' },
    { symbol: 's', example: 'see', desc: 'Vô thanh, rít' },
    { symbol: 'z', example: 'zoo', desc: 'Hữu thanh, rít' },
    { symbol: 'ʃ', example: 'she', desc: 'Vô thanh, sau rít' },
    { symbol: 'ʒ', example: 'vision', desc: 'Hữu thanh, sau rít' },
    { symbol: 'h', example: 'hat', desc: 'Hơi hở' },
    { symbol: 'tʃ', example: 'check', desc: 'Vô thanh, tắc-rít' },
    { symbol: 'dʒ', example: 'judge', desc: 'Hữu thanh, tắc-rít' },
    { symbol: 'm', example: 'man', desc: 'Mũi, môi' },
    { symbol: 'n', example: 'now', desc: 'Mũi, chân răng' },
    { symbol: 'ŋ', example: 'sing', desc: 'Mũi, hàm ếch' },
    { symbol: 'l', example: 'light', desc: 'Cạnh lưỡi' },
    { symbol: 'r', example: 'red', desc: 'Lưỡi cuộn' },
    { symbol: 'w', example: 'wet', desc: 'Môi-hàm ếch' },
    { symbol: 'j', example: 'yes', desc: 'Hàm ếch' },
  ]

  const VOWELS = [
    { symbol: 'iː', example: 'see', desc: 'Dài, đóng' },
    { symbol: 'ɪ', example: 'sit', desc: 'Ngắn, gần đóng' },
    { symbol: 'e', example: 'ten', desc: 'Ngắn, nửa đóng' },
    { symbol: 'æ', example: 'cat', desc: 'Ngắn, nửa mở' },
    { symbol: 'ɑː', example: 'car', desc: 'Dài, mở' },
    { symbol: 'ɒ', example: 'hot', desc: 'Ngắn, mở' },
    { symbol: 'ɔː', example: 'saw', desc: 'Dài, nửa mở' },
    { symbol: 'ʊ', example: 'put', desc: 'Ngắn, gần đóng' },
    { symbol: 'uː', example: 'too', desc: 'Dài, đóng' },
    { symbol: 'ʌ', example: 'cup', desc: 'Ngắn, nửa mở' },
    { symbol: 'ɜː', example: 'bird', desc: 'Dài, nửa đóng' },
    { symbol: 'ə', example: 'about', desc: 'Ngắn, âm trung' },
    { symbol: 'eɪ', example: 'day', desc: 'Đôi, đóng' },
    { symbol: 'aɪ', example: 'my', desc: 'Đôi, mở' },
    { symbol: 'ɔɪ', example: 'boy', desc: 'Đôi, nửa mở' },
    { symbol: 'aʊ', example: 'now', desc: 'Đôi, mở' },
    { symbol: 'əʊ', example: 'go', desc: 'Đôi, nửa đóng' },
    { symbol: 'ɪə', example: 'here', desc: 'Đôi, gần đóng' },
    { symbol: 'eə', example: 'hair', desc: 'Đôi, nửa mở' },
    { symbol: 'ʊə', example: 'sure', desc: 'Đôi, gần đóng' },
  ]

  const items = currentGroup === 'consonants' ? CONSONANTS : VOWELS

  function speak(symbol: string) {
    const utterance = new SpeechSynthesisUtterance(symbol)
    utterance.lang = 'en-US'; utterance.rate = 0.8
    speechSynthesis.speak(utterance)
  }

  if (studyMode) {
    const item = items[current]
    if (!item) { setStudyMode(false); return null }
    return (
      <div className="max-w-md mx-auto py-8 text-center space-y-6">
        <div className="text-sm text-muted-foreground">{current + 1}/{items.length}</div>
        <div className="text-6xl font-bold text-[#00E5FF] font-mono">{item.symbol}</div>
        <div className="text-lg text-muted-foreground">{item.desc}</div>
        <div className="flex items-center justify-center gap-2 text-base">
          <span className="italic">"{item.example}"</span>
          <button onClick={() => speak(item.symbol)} className="text-[#00E5FF] hover:text-[#00E5FF]/80">
            <Mic2 className="h-5 w-5" />
          </button>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setScore(score + 1); setCurrent(current + 1) }}>
            Đã biết
          </Button>
          <Button size="sm" onClick={() => setCurrent(current + 1)}>
            Học tiếp
          </Button>
        </div>
        {current >= items.length - 1 && (
          <Button onClick={() => { setStudyMode(false); setCurrent(0) }} className="w-full">
            Hoàn thành! ({score}/{items.length})
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant={currentGroup === 'consonants' ? 'default' : 'outline'}
            onClick={() => setCurrentGroup('consonants')}>Phụ âm ({CONSONANTS.length})</Button>
          <Button size="sm" variant={currentGroup === 'vowels' ? 'default' : 'outline'}
            onClick={() => setCurrentGroup('vowels')}>Nguyên âm ({VOWELS.length})</Button>
        </div>
        <Button size="sm" onClick={() => { setStudyMode(true); setCurrent(0); setScore(0) }} className="gap-1.5">
          <Mic2 className="h-3.5 w-3.5" />Học ngay
        </Button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {items.map((item, i) => (
          <button key={i} onClick={() => setShowDetail(showDetail === i ? null : i)}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-[#00E5FF]/30 hover:bg-[#00E5FF]/[0.04] transition-all">
            <span className="text-lg font-bold text-[#00E5FF] font-mono">{item.symbol}</span>
            <span className="text-[10px] text-muted-foreground">{item.example}</span>
          </button>
        ))}
      </div>

      {showDetail !== null && items[showDetail] && (
        <div className="rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/[0.04] p-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-[#00E5FF] font-mono">{items[showDetail].symbol}</span>
            <div>
              <p className="font-medium">{items[showDetail].desc}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ví dụ: <span className="italic">"{items[showDetail].example}"</span>
              </p>
              <button onClick={() => speak(items[showDetail].symbol)}
                className="text-[#00E5FF] hover:text-[#00E5FF]/80 text-sm mt-1 flex items-center gap-1">
                <Mic2 className="h-4 w-4" />Nghe phát âm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Language() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Ngôn ngữ" description="Từ vựng & Phiên âm IPA" />

      <Tabs defaultValue="vocabulary">
        <TabsList className="bg-white/[0.04] border border-white/[0.07]">
          <TabsTrigger value="vocabulary" className="gap-2"><BookOpen className="h-3.5 w-3.5" />Từ vựng</TabsTrigger>
          <TabsTrigger value="ipa" className="gap-2"><Mic2 className="h-3.5 w-3.5" />IPA</TabsTrigger>
        </TabsList>
        <TabsContent value="vocabulary" className="mt-5"><VocabularyTab /></TabsContent>
        <TabsContent value="ipa" className="mt-5"><IPATab /></TabsContent>
      </Tabs>
    </motion.div>
  )
}
