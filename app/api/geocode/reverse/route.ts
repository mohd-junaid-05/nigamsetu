import { NextRequest, NextResponse } from 'next/server';

export type ReverseGeocodeResponse = {
  success: boolean;
  displayName: string;
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postcode?: string;
};

export async function GET(req: NextRequest): Promise<NextResponse<ReverseGeocodeResponse>> {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');

  const lat = parseFloat(latStr || '');
  const lng = parseFloat(lngStr || '');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      {
        success: false,
        displayName: 'Invalid coordinates provided',
      },
      { status: 400 }
    );
  }

  const fallbackName = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'NigamSetu/1.0 (contact@nigamsetu.org)',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({
        success: true,
        displayName: fallbackName,
      });
    }

    const data = await res.json();
    const address = data.address || {};
    const displayName =
      data.display_name ||
      [address.road, address.suburb, address.city, address.state].filter(Boolean).join(', ') ||
      fallbackName;

    return NextResponse.json({
      success: true,
      displayName,
      road: address.road,
      suburb: address.suburb,
      city: address.city || address.town || address.village,
      state: address.state,
      postcode: address.postcode,
    });
  } catch {
    return NextResponse.json({
      success: true,
      displayName: fallbackName,
    });
  }
}
