# Fonts Directory

This directory contains TrueType fonts used for PDF generation with Cyrillic support.

## Files

- `arial.ttf` - Arial Regular (supports Cyrillic)
- `arialbd.ttf` - Arial Bold (supports Cyrillic)

## Why These Fonts?

The default PDFKit fonts (Helvetica, Times-Roman, etc.) do not support Cyrillic characters. 
To properly render Bulgarian text in PDFs, we use Arial TTF fonts which have full Unicode support.

## Source

These fonts are copied from the Windows system fonts directory (`C:\Windows\Fonts\`).
On Windows systems, these fonts are already installed and licensed for use.

## Usage

The fonts are automatically loaded by `src/lib/pdf-generator.ts` when generating dispatch PDFs.

## Alternative Fonts

If Arial is not available on your system, you can use other Cyrillic-supporting fonts:
- **DejaVu Sans** (open source, excellent Cyrillic support)
- **Liberation Sans** (open source alternative to Arial)
- **Roboto** (Google Font with Cyrillic support)

Download open-source alternatives from:
- https://dejavu-fonts.github.io/
- https://github.com/liberationfonts/liberation-fonts
- https://fonts.google.com/specimen/Roboto

## License Note

Arial is a proprietary font owned by Microsoft. Using these font files is licensed for 
rendering on systems where Windows is installed. For production deployment on Linux servers,
consider replacing with open-source alternatives like DejaVu Sans or Liberation Sans.
