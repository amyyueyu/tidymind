import { useLang } from '@/contexts/LanguageContext'
import { Globe } from 'lucide-react'

export function LangToggle() {
  const { lang, setLang, t } = useLang()
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                 text-xs font-semibold border border-border/50
                 bg-background/80 hover:bg-muted transition-colors
                 text-muted-foreground hover:text-foreground"
    >
      <Globe className="w-3.5 h-3.5" />
      {t('lang.switch')}
    </button>
  )
}
