import { SWRConfig } from 'swr';

import { GardenViewer } from '@/widgets/garden-viewer';
import type { GardenBonsaiItem } from '@/widgets/garden-viewer';
import { createServerClient } from '@/shared/lib/supabase';

export default async function GardenPage() {
    const supabase = createServerClient();
    const { data } = await supabase
        .from('bonsai')
        .select('*, users!inner (display_name, avatar_url)')
        .order('created_at', { ascending: true });

    const bonsaiList = (data ?? []) as GardenBonsaiItem[];

    return (
        <SWRConfig value={{ fallback: { 'all-bonsai': data } }}>
            <GardenViewer bonsaiList={bonsaiList} />
        </SWRConfig>
    );
}
