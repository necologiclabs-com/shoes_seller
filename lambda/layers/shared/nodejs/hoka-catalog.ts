/**
 * HOKA製品カタログ（手動メンテナンス）
 * 
 * HOKAの公式サイトからのスクレイピングが困難なため、
 * 人気モデルを手動でリストアップします。
 * 価格と画像URLは自動的に取得されます。
 */

export interface HokaProduct {
    modelNumber: string;
    name: string;
    gender: 'MENS' | 'WOMENS' | 'UNISEX';
    category: 'trail' | 'road' | 'hike';
    description: string;
    officialUrl: string;
}

/**
 * HOKA トレイルランニングシューズ カタログ
 */
export const HOKA_TRAIL_CATALOG: HokaProduct[] = [
    // Speedgoat シリーズ - HOKAのベストセラートレイルシューズ
    {
        modelNumber: 'SPEEDGOAT5',
        name: 'Speedgoat 5',
        gender: 'MENS',
        category: 'trail',
        description: 'テクニカルトレイルに最適。優れたグリップ力と安定性を提供する、HOKAを代表するトレイルシューズ。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/speedgoat-5/'
    },
    {
        modelNumber: 'SPEEDGOAT5W',
        name: 'Speedgoat 5',
        gender: 'WOMENS',
        category: 'trail',
        description: 'テクニカルトレイルに最適。優れたグリップ力と安定性を提供する、HOKAを代表するトレイルシューズ。',
        officialUrl: 'https://www.hoka.com/jp/womens-trail/speedgoat-5/'
    },

    // Tecton X シリーズ - カーボンプレート搭載
    {
        modelNumber: 'TECTON-X2',
        name: 'Tecton X 2',
        gender: 'MENS',
        category: 'trail',
        description: 'カーボンファイバープレート搭載。スピードと推進力を重視したレーシングトレイルシューズ。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/tecton-x-2/'
    },
    {
        modelNumber: 'TECTON-X3',
        name: 'Tecton X 3',
        gender: 'MENS',
        category: 'trail',
        description: '最新のカーボンプレートテクノロジー。さらなるスピードと快適性を実現。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/tecton-x-3/'
    },

    // Zinal シリーズ - 軽量レーシングモデル
    {
        modelNumber: 'ZINAL',
        name: 'Zinal',
        gender: 'MENS',
        category: 'trail',
        description: '超軽量トレイルレーシングシューズ。スピード重視のランナーに最適。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/zinal/'
    },
    {
        modelNumber: 'ZINAL2',
        name: 'Zinal 2',
        gender: 'MENS',
        category: 'trail',
        description: 'Zinalの進化版。さらなる軽量化とグリップ力の向上を実現。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/zinal-2/'
    },

    // Challenger シリーズ - バーサタイルモデル
    {
        modelNumber: 'CHALLENGER7',
        name: 'Challenger 7',
        gender: 'MENS',
        category: 'trail',
        description: 'トレイルとロードの両方に対応。万能型トレイルシューズ。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/challenger-7/'
    },
    {
        modelNumber: 'CHALLENGER-ATR7',
        name: 'Challenger ATR 7',
        gender: 'MENS',
        category: 'trail',
        description: 'All Terrain対応。あらゆる地形で快適に走れる設計。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/challenger-atr-7/'
    },

    // Mafate シリーズ - ウルトラディスタンスモデル
    {
        modelNumber: 'MAFATE-SPEED4',
        name: 'Mafate Speed 4',
        gender: 'MENS',
        category: 'trail',
        description: '超長距離トレイルラン用。最大限のクッションと耐久性を提供。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/mafate-speed-4/'
    },
    {
        modelNumber: 'EVO-MAFATE2',
        name: 'Evo Mafate 2',
        gender: 'MENS',
        category: 'trail',
        description: '軽量版Mafate。長距離でもスピードを維持できる設計。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/evo-mafate-2/'
    },

    // その他の人気モデル
    {
        modelNumber: 'TORRENT3',
        name: 'Torrent 3',
        gender: 'MENS',
        category: 'trail',
        description: 'レスポンシブで軽量。テンポの速いトレイルランに最適。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/torrent-3/'
    },
    {
        modelNumber: 'SKY-ARKALI',
        name: 'Sky Arkali',
        gender: 'MENS',
        category: 'trail',
        description: '高いクッション性と安定性。長時間のトレイルランをサポート。',
        officialUrl: 'https://www.hoka.com/jp/mens-trail/sky-arkali/'
    },
];

/**
 * モデル番号から製品情報を取得
 */
export function getHokaProduct(modelNumber: string): HokaProduct | undefined {
    return HOKA_TRAIL_CATALOG.find(p => p.modelNumber === modelNumber);
}

/**
 * すべてのHOKA製品を取得
 */
export function getAllHokaProducts(): HokaProduct[] {
    return HOKA_TRAIL_CATALOG;
}
