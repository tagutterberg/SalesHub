import React from 'react';
import { Card } from '../components/ui';

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Orders Report">
          <p className="text-gray-600 mb-4">Generate detailed reports of all orders</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Generate Report
          </button>
        </Card>

        <Card title="Invoices Report">
          <p className="text-gray-600 mb-4">Generate detailed reports of all invoices</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Generate Report
          </button>
        </Card>

        <Card title="Revenue Report">
          <p className="text-gray-600 mb-4">Generate revenue analysis reports</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Generate Report
          </button>
        </Card>

        <Card title="Voyages Report">
          <p className="text-gray-600 mb-4">Generate detailed reports of all voyages</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Generate Report
          </button>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
