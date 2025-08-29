import EditTradingPair from '@/components/admin/EditTradingPair';

interface EditTradingPairPageProps {
  params: {
    id: string;
  };
}

export default function EditTradingPairPage({ params }: EditTradingPairPageProps) {
  const { id } = params;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <EditTradingPair tradingPairId={id} />
    </div>
  );
}