import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { requireAdmin } from '@/lib/api-auth';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    const purpose = String(formData.get('purpose') ?? 'banner');
    const folder =
      purpose === 'product' || purpose === 'products'
        ? 'mundotech/products'
        : 'mundotech/banners';

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    const isProduct = folder === 'mundotech/products';

    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: 'image',
      transformation: [
        {
          quality:       'auto:good',
          fetch_format:  'auto',
          width:         isProduct ? 1200 : 1920,
          crop:          'limit',
        },
      ],
    });

    return NextResponse.json({
      url:      result.secure_url,
      publicId: result.public_id,
      width:    result.width,
      height:   result.height,
    });
  } catch (err) {
    console.error('[upload] Cloudinary error:', err);
    return NextResponse.json(
      { error: 'Error al subir imagen. Verifica las credenciales de Cloudinary.' },
      { status: 500 }
    );
  }
}
