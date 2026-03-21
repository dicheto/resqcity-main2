export default function TermsPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center transition-colors duration-500 bg-gradient-to-br from-[#f5f7fa] to-[#c3cfe2] dark:from-[#181825] dark:to-[#23263a] py-12 px-2">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-[#7C3AED]/30 to-[#10b981]/20 dark:from-[#7C3AED]/40 dark:to-[#10b981]/30 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-[#06b6d4]/30 to-[#7C3AED]/10 dark:from-[#06b6d4]/40 dark:to-[#7C3AED]/20 rounded-full blur-2xl opacity-50 animate-pulse" />
      </div>
      <div className="relative z-10 w-full max-w-2xl rounded-3xl shadow-2xl bg-white/90 dark:bg-[#23263a]/90 backdrop-blur-lg p-10 border border-[#e0e7ef] dark:border-[#23263a] transition-colors duration-500">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">📜</span>
          <h1 className="text-3xl font-extrabold grad-violet dark:text-[#a5b4fc]">Общи условия за ползване на платформата ResQCity</h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-300 mb-6">Последна актуализация: 21 март 2026 г.</p>
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>1.</span> Общи положения</h2>
            <p>1.1. Настоящите Общи условия уреждат отношенията между потребителите и платформата ResQCity, собственост на ResQCity Team.</p>
            <p>1.2. С регистрацията си в платформата, потребителят потвърждава, че е запознат и приема настоящите условия.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>2.</span> Регистрация и достъп</h2>
            <p>2.1. За да използвате пълната функционалност на платформата, е необходима регистрация с валиден имейл адрес.</p>
            <p>2.2. Потребителят носи отговорност за опазването на своите данни за достъп.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>3.</span> Права и задължения на потребителите</h2>
            <p>3.1. Потребителят се задължава да предоставя вярна информация и да не злоупотребява с платформата.</p>
            <p>3.2. Забранено е публикуването на невярна, обидна или незаконна информация.</p>
            <p>3.3. Потребителят има право да подава сигнали, да коментира и да използва предоставените услуги съгласно настоящите условия.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>4.</span> Права и задължения на администратора</h2>
            <p>4.1. Администраторът има право да променя функционалността и съдържанието на платформата без предварително уведомление.</p>
            <p>4.2. Администраторът не носи отговорност за съдържание, публикувано от потребителите.</p>
            <p>4.3. Администраторът има право да блокира достъпа на потребители при нарушение на условията.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>5.</span> Защита на личните данни</h2>
            <p>5.1. Личните данни се обработват съгласно <a href="/gdpr-policy" className="text-[#06b6d4] dark:text-[#2dd4bf] underline font-semibold">Политиката за поверителност</a>.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>6.</span> Промяна на условията</h2>
            <p>6.1. Платформата си запазва правото да променя настоящите условия по всяко време. Промените влизат в сила с публикуването им.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>7.</span> Контакти</h2>
            <p>За въпроси: <a href="mailto:support@resqcity.bg" className="text-[#06b6d4] dark:text-[#2dd4bf] underline font-semibold">support@resqcity.bg</a></p>
          </div>
        </section>
        <hr className="my-8 border-[#e0e7ef] dark:border-[#23263a]" />
        <p className="text-xs text-gray-400 dark:text-gray-300 text-center">С регистрацията си в платформата Вие потвърждавате, че сте запознати и приемате настоящите Общи условия.</p>
      </div>
    </div>
  );
}
