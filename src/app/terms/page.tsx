import fs from 'fs';
import path from 'path';

export default function TermsPage() {
  const filePath = path.join(process.cwd(), 'public', 'terms-bg.md');
  const content = fs.readFileSync(filePath, 'utf8');
  return (
    <div className="prose max-w-2xl mx-auto py-12">
      <h1>Общи условия</h1>
      <article dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
    </div>
  );
}
