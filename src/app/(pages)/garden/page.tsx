import { SWRConfig } from 'swr';

import { GardenContent } from './GardenContent';

import { createServerClient } from '@/shared/lib/supabase';

export default async function GardenPage() {
    const supabase = createServerClient();
    const { data } = await supabase
        .from('bonsai')
        .select('*, users!inner (display_name, avatar_url)')
        .order('created_at', { ascending: true });

    return (
        <SWRConfig value={{ fallback: { 'all-bonsai': data } }}>
            <GardenContent />
        </SWRConfig>
    );
}
