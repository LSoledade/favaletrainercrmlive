import { SessionManagement } from '@/features/scheduling/components/SessionManagement'; // Updated
import { Card, CardContent } from '@/components/data-display/Card'; // Updated

export default function SessionsPage() {
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full border-gray-100 dark:border-gray-700 shadow-sm rounded-xl">
        <CardContent className="pt-6">
          <SessionManagement />
        </CardContent>
      </Card>
    </div>
  );
}
