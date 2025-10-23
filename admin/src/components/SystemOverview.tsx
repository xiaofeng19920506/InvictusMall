import React from 'react';
import { ExternalLink, Database, Globe, Monitor, ArrowRight } from 'lucide-react';

const SystemOverview: React.FC = () => {
  const systemFlow = [
    {
      name: 'Customer',
      description: 'Browses stores',
      icon: '👤',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      name: 'Frontend',
      description: 'Next.js Store Interface',
      icon: <Globe className="w-5 h-5" />,
      url: 'http://localhost:3000',
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'Backend API',
      description: 'Express.js Server',
      icon: <Database className="w-5 h-5" />,
      url: 'http://localhost:3001',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      name: 'Database',
      description: 'MySQL Store Data',
      icon: '🗄️',
      color: 'bg-orange-100 text-orange-800'
    },
    {
      name: 'Admin',
      description: 'Management Dashboard',
      icon: <Monitor className="w-5 h-5" />,
      url: 'http://localhost:3003',
      color: 'bg-red-100 text-red-800'
    }
  ];

  const integrationFeatures = [
    {
      title: 'Cross-App Navigation',
      description: 'Easy navigation between all three applications',
      status: '✅ Active'
    },
    {
      title: 'Real-time Data Sync',
      description: 'Changes in admin immediately reflect in frontend',
      status: '✅ Active'
    },
    {
      title: 'System Monitoring',
      description: 'Monitor health and status of all applications',
      status: '✅ Active'
    },
    {
      title: 'Unified Branding',
      description: 'Consistent Invictus Mall branding across apps',
      status: '✅ Active'
    },
    {
      title: 'API Documentation',
      description: 'Comprehensive Swagger documentation',
      status: '✅ Active'
    }
  ];

  return (
    <div className="space-y-6">
      {/* System Architecture Flow */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Architecture</h3>
          <p className="card-subtitle">
            Complete flow of the Invictus Mall ecosystem
          </p>
        </div>

        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {systemFlow.map((item, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center min-w-0 flex-1">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${item.color} mb-3`}>
                  {typeof item.icon === 'string' ? (
                    <span className="text-2xl">{item.icon}</span>
                  ) : (
                    item.icon
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 text-center">{item.name}</h4>
                <p className="text-sm text-gray-600 text-center mb-2">{item.description}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {index < systemFlow.length - 1 && (
                <ArrowRight className="w-6 h-6 text-gray-400 mx-4 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Integration Features */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Integration Features</h3>
          <p className="card-subtitle">
            Connected features across all applications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrationFeatures.map((feature, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900">{feature.title}</h4>
                <span className="text-sm text-green-600 font-medium">{feature.status}</span>
              </div>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access Panel */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Access</h3>
          <p className="card-subtitle">
            Direct links to all system components
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-6 h-6 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Customer Store</h4>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 ml-auto" />
            </div>
            <p className="text-sm text-gray-600">Browse stores as a customer</p>
            <div className="text-xs text-blue-600 mt-2">localhost:3000</div>
          </a>

          <a
            href="http://localhost:3001/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-6 h-6 text-purple-600" />
              <h4 className="font-semibold text-gray-900">API Documentation</h4>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 ml-auto" />
            </div>
            <p className="text-sm text-gray-600">Explore API endpoints</p>
            <div className="text-xs text-purple-600 mt-2">localhost:3001/api-docs</div>
          </a>

          <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Monitor className="w-6 h-6 text-orange-600" />
              <h4 className="font-semibold text-gray-900">Admin Dashboard</h4>
              <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded ml-auto">Current</span>
            </div>
            <p className="text-sm text-gray-600">Manage stores and system</p>
            <div className="text-xs text-orange-600 mt-2">localhost:3003</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemOverview;
