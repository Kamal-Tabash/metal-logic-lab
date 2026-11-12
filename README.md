# مختبر منطق المعدن · METAL LOGIC LAB

**العربية** · [English below](#metal-logic-lab)

المستودع الرسمي للمختبر التفاعلي الموازي لثلاثية «منطق المعدن»: خمس عشرة أداة هندسية تفاعلية تحسب وترسم القطع بمقاييسها الواقعية أمام القارئ لحظة بلحظة.

تطبيق صفحة واحدة (SPA) مبني بملفات ثابتة كلياً، يعمل دون خادم، ودون قواعد بيانات، ولا يجري أي اتصالات أو طلبات لجهات خارجية عند الاستخدام. التطبيق ثنائي اللغة ويعمل بكفاءة متطابقة بالعربية (الأصل) والإنجليزية.

---

## التجربة الفورية دون تثبيت

يمكنك فتح وتجربة المختبر مباشرة بنقرة مزدوجة على الملف المنفرد:
[`quick-try/metal-logic-lab.html`](quick-try/metal-logic-lab.html)

هذا الملف يضم التطبيق كاملاً داخل ملف HTML واحد؛ يعمل بالكامل دون اتصال بالإنترنت، ويمكنك مشاركته ونقله كنظام مستقل بذاته. زر التبديل في الأعلى ينقلك بين العربية والإنجليزية بسلاسة.

---

## سياسة النصوص وحماية محتوى الكتب (عدم الرفع إلى GitHub)

> **تنبيه أساسي:** هذا المستودع مخصص للأدوات البرمجية، والمحركات الحسابية، وواجهات الرسم فقط. **نصوص الكتب الثلاثة ليست جزءاً من المستودع ولن تُرفع إليه إطلاقاً.**

- مسار `reference/` مضاف داخل ملف `.gitignore` ولن يتتبعه Git.
- اختبارات مطابقة الاقتباسات الدقيقة تعمل **محلياً فقط** عند وضع ملفاتك المرجعية الشخصية (`b1.txt` و`b2.txt` و`b3.txt`) داخل مجلد `reference/` على بيئة العمل الخاصة بك.
- في حال غياب هذه الملفات (كما هو الحال عند استنساخ المستودع من قِبل أي طرف آخر)، يتخطى نظام الاختبار فحص الاقتباسات تلقائياً، ويعمل فحص المحركات الرياضية والهندسية واختبارات المتصفح بكفاءة تامة.

---

## نظام اللغتين

- **العربية:** هي الأصل والمصدر الأساسي، ومساراتها نظيفة ومباشرة (مثل: `#prong`).
- **الإنجليزية:** ترجمة سياقية مكافئة بالمعنى وليست حرفية، وتبدأ مساراتها بـ `en/` (مثل: `#en/prong`، و`#en` للرئيسية).
- **التدوين اللحظي:** كل نص يُكتب في نفس مكان ظهوره عبر الدالة الموحدة `tx("عربي", "English")` دون ملفات ترجمة خارجية منفصلة منعاً لأي تفاوت في التحديث.
- **بوابة التحقق الصارم (`npm run gate`):** تختبر كل أداة بالإنجليزية وتضمن عدم تسرب أي حرف عربي في الواجهة أو داخل لوحات الرسم بالـ Canvas.

---

## الإعداد والتشغيل

يتطلب بيئة **Node.js 20** أو أحدث.

```sh
npm install
npm run dev            # تشغيل خادم التطوير المحلي على http://localhost:5173
npm test               # تشغيل اختبارات المحركات الرياضية وحالات التحقق
npm run build          # بناء حزمة الإنتاج للمواقع داخل مجلد dist/
npm run test:e2e       # تشغيل اختبارات المتصفح على 5 أبعاد شاشة والتحقق من الوصولية
npm run build:offline  # توليد نسخة الملف الواحد المدمج المستقل
npm run gate           # البوابة الشاملة: فحص الأنواع، الحساب، البنائين، واختبار المتصفح باللغتين
مجلد dist/ الناتج عن عملية البناء هو كل ما تحتاجه للرفع على أي استضافة ملفات ثابتة (مثل Cloudflare Pages أو GitHub Pages). جميع المسارات نسبية وتعمل سواء رُفعت في جذر النطاق أو داخل مجلد فرعي.
خريطة الروابط السريعة (Deep Linking)
#home أو الرابط المباشر: يفتح الشاشة الرئيسية.
#prong: يفتح الأداة المحددة باسمها مباشرة.
#limits-10: يفتح الأداة المرتبطة بالفصل العاشر من كتاب «حدود المادة». إذا احتوى الفصل على أكثر من أداة، يفتح صفحة الهبوط مركزاً على هذا الفصل.
رموز الكتب: impact (بنية الأثر)، limits (حدود المادة)، decision (صياغة القرار).
البنية المعمارية للمشروع
المسار / الملف	الوظيفة
src/core/books.ts	فهرس الكتب الثلاثة وفصولها وعناوينها الرسمية
src/core/data.ts	المرجع الموحد لجميع الثوابت والأرقام وقيم المقارنة المعتمدة مع إسنادها
src/core/registry.ts	سجل الأدوات الـ 15، وحالات جاهزيتها، وفصولها المرتبطة
src/core/cases.ts	بنية نوع «حالة الكتاب»: شروط الفحص، والنتائج المتوقعة، ومدخلات المحرك
src/core/cad/	محرك الرسم الهندسي: الشبكة المليمترية، التظليل، التهشير، خطوط الأبعاد، ومقاطع القطع
src/app/	واجهة المستخدم العامة: صفحة الهبوط، شريط التصفح، الألواح الجانبية، ولوحات التحكم
src/tools/<id>/	كل أداة في مجلد مستقل: المحرك الرياضي (model.ts)، الرسم (draw.ts)، الحالات (cases.ts)، والواجهة (index.tsx أو def.ts)
e2e/	اختبارات المتصفح الشاملة للتحقق من سلامة الواجهة والتفاعل


METAL LOGIC LAB
The interactive companion lab to the Arabic trilogy Metal Logic (منطق المعدن): Architecture of Impact, The Limits of Material, and The Craft of Decision.
Fifteen engineering tools that draw each piece to true scale and solve the mechanics live on screen: prong resilience, hollow bangle wall limits, engraving depth, solder ladder sequencing, ring resizing limits, enamel cracking, tolerance stack-up, and center of gravity balance.
A lightweight, purely static Single Page Application: zero backend, zero databases, and zero external tracking or assets. English is an idiomatic contextual translation paired side-by-side with the Arabic original.
Quick Offline Run
Download and open the single standalone build:
quick-try/metal-logic-lab.html
This single self-contained HTML file runs fully offline with no server setup required. The language toggle in the header switches between English and Arabic; appending #en opens directly in English.
Repository Policy & Book Texts Exclusion
Note: This public repository is strictly dedicated to source code, simulation engines, and drafting interfaces. The full book texts are proprietary and are never committed or pushed to GitHub.
The reference/ directory is explicitly excluded via .gitignore.
Verification of verbatim citations runs locally only when reference files (b1.txt, b2.txt, b3.txt) are placed in your local reference/ directory.
When these local files are absent, test runners automatically skip text verification while continuing to validate all geometric engines, tolerance checks, and browser assertions.
Getting Started
Requires Node.js 20 or newer.
Sh
npm install
npm run dev            # Start local dev server at http://localhost:5173
npm test               # Run engine unit tests and verification checks
npm run build          # Generate production static bundle in dist/
npm run test:e2e       # Run multi-viewport browser and accessibility tests
npm run build:offline  # Build the single-file offline distribution
npm run gate           # Full delivery gate: TypeScript, tests, both builds, e2e
The output dist/ directory contains standard static files ready for deployment on any static hosting environment (Cloudflare Pages, GitHub Pages, or plain web servers). All assets use relative paths and function seamlessly in root domains or nested subdirectories.
Routing & Deep Linking
#home (or root): Main overview and tool index.
#prong: Direct link to an individual tool.
#limits-10: Directly navigates to the tool corresponding to Chapter 10 of The Limits of Material. If multiple tools apply, it lands on the chapter's focus view.
Book identifiers: impact (Architecture of Impact), limits (The Limits of Material), decision (The Craft of Decision).
Architecture
Path / File	Role
src/core/books.ts	Book registry, metadata, and chapter titles
src/core/data.ts	Central source of truth for physical constants, workshop thresholds, and citations
src/core/registry.ts	Tool registry, readiness state, and book mapping
src/core/cases.ts	Verification schema defining test inputs, expectations, and verdicts
src/core/cad/	Lightweight 2D vector drafting kit (grids, hatching, dimension lines, sections)
src/app/	Shell, layout components, drawer, control sheet, and model guidelines
src/tools/<id>/	Modular tool bundles: physics model (model.ts), drawing (draw.ts), checks (cases.ts), and configuration
e2e/	Playwright test suites covering viewport responsive behavior and localization
License & Copyright
© Kemal Tabash 2026. All rights reserved.
This repository provides the software engineering and simulation layer for the trilogy. Full book manuscripts are private and excluded from version control.