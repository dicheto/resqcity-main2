import fs from 'fs';
import path from 'path';

export default function GdprPolicyPage() {
  const filePath = path.join(process.cwd(), 'public', 'gdpr-policy-bg.md');
  const content = fs.readFileSync(filePath, 'utf8');
  return (
    <div className="prose max-w-2xl mx-auto py-12">
      <h1>Политика за поверителност</h1>
      <article dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
    </div>
  );
}
