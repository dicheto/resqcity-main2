export default function GdprPolicyPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center transition-colors duration-500 bg-gradient-to-br from-[#f5f7fa] to-[#c3cfe2] dark:from-[#181825] dark:to-[#23263a] py-12 px-2">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-[#7C3AED]/30 to-[#06b6d4]/20 dark:from-[#7C3AED]/40 dark:to-[#06b6d4]/30 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-[#10b981]/30 to-[#7C3AED]/10 dark:from-[#10b981]/40 dark:to-[#7C3AED]/20 rounded-full blur-2xl opacity-50 animate-pulse" />
      </div>
      <div className="relative z-10 w-full max-w-2xl rounded-3xl shadow-2xl bg-white/90 dark:bg-[#23263a]/90 backdrop-blur-lg p-10 border border-[#e0e7ef] dark:border-[#23263a] transition-colors duration-500">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🔒</span>
          <h1 className="text-3xl font-extrabold grad-violet dark:text-[#a5b4fc]">Политика за поверителност и защита на личните данни (GDPR)</h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-300 mb-6">Последна актуализация: 21 март 2026 г.</p>
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>1.</span> Въведение</h2>
            <p>Платформата ResQCity се ангажира с опазването на Вашата поверителност и защита на личните Ви данни съгласно Общия регламент за защита на данните (GDPR) и българското законодателство.</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>2.</span> Какви данни събираме</h2>
            <ul className="list-disc ml-6 text-sm">
              <li>Име, имейл адрес, телефон (при регистрация)</li>
              <li>Данни за местоположение (ако е разрешено от потребителя)</li>
              <li>История на сигнали, коментари и действия в платформата</li>
              <li>Техническа информация: IP адрес, тип устройство, браузър</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>3.</span> Цели на обработката</h2>
            <ul className="list-disc ml-6 text-sm">
              <li>Идентификация и комуникация с потребителите</li>
              <li>Управление на сигнали и инциденти</li>
              <li>Подобряване на услугите и сигурността</li>
              <li>Спазване на законови задължения</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>4.</span> Съхранение и защита на данните</h2>
            <ul className="list-disc ml-6 text-sm">
              <li>Данните се съхраняват в защитена облачна инфраструктура (Supabase, ЕС)</li>
              <li>Използват се криптирани връзки и съвременни мерки за сигурност</li>
              <li>Достъп до данните имат само оторизирани лица</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>5.</span> Права на потребителите</h2>
            <ul className="list-disc ml-6 text-sm">
              <li>Достъп до личните Ви данни</li>
              <li>Коригиране или изтриване на данни</li>
              <li>Ограничаване или възражение срещу обработката</li>
              <li>Преносимост на данните</li>
              <li>Оттегляне на съгласие по всяко време</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>6.</span> Споделяне на данни</h2>
            <ul className="list-disc ml-6 text-sm">
              <li>Данните не се предоставят на трети лица без Вашето изрично съгласие, освен ако това не се изисква по закон</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>7.</span> Бисквитки и проследяване</h2>
            <ul className="list-disc ml-6 text-sm">
              <li>Използваме само необходими бисквитки за функциониране на платформата</li>
              <li>Не се използват маркетингови или проследяващи бисквитки без съгласие</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#7C3AED] dark:text-[#a5b4fc] flex items-center gap-2"><span>8.</span> Контакти</h2>
            <p>За въпроси относно поверителността: <a href="mailto:privacy@resqcity.bg" className="text-[#06b6d4] dark:text-[#2dd4bf] underline font-semibold">privacy@resqcity.bg</a></p>
          </div>
        </section>
        <hr className="my-8 border-[#e0e7ef] dark:border-[#23263a]" />
        <p className="text-xs text-gray-400 dark:text-gray-300 text-center">С използването на платформата Вие потвърждавате, че сте запознати и приемате настоящата политика за поверителност.</p>
      </div>
    </div>
  );
}
