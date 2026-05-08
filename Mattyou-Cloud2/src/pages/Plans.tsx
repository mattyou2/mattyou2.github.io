import { Check, Zap, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Plans() {
  const { profile } = useAuth();

  const plans = [
    {
      name: 'Free',
      price: '€0',
      storage: '10 GB',
      icon: Zap,
      features: ['Basis opslag', 'API Toegang', 'Basis ondersteuning'],
      tier: 'free'
    },
    {
      name: 'Plus',
      price: '€5',
      storage: '50 GB',
      icon: Crown,
      features: ['Meer opslag', 'Prioriteit API', 'Snellere uploads'],
      tier: 'plus'
    },
    {
      name: 'Premium',
      price: '€15',
      storage: '1 TB',
      icon: Crown,
      features: ['Onbeperkte API', 'Custom AI Sortering', 'Priority support'],
      tier: 'premium'
    }
  ];

  return (
    <div className="p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-slate-50 mb-4">Kies je plan</h1>
        <p className="text-slate-400">Huidig plan: <span className="text-blue-400 font-bold uppercase">{profile?.plan}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = profile?.plan === plan.tier;
          return (
            <div key={plan.name} className={`bg-slate-900 border ${isCurrent ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700'} rounded-2xl p-8 flex flex-col`}>
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${isCurrent ? 'text-blue-400' : 'text-slate-500'}`} />
                {isCurrent && <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">Actueel</span>}
              </div>
              <h2 className="text-2xl font-bold text-slate-50 mb-2">{plan.name}</h2>
              <div className="text-3xl font-bold text-slate-50 mb-6">{plan.price}<span className="text-sm font-normal text-slate-400">/mo</span></div>
              
              <div className="mb-8 flex-1">
                <div className="text-lg font-semibold text-blue-400 mb-4">{plan.storage} Storage</div>
                <ul className="space-y-3">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center text-slate-300">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {!isCurrent && (
                <button className="w-full py-3 px-6 rounded-xl bg-slate-800 text-slate-50 hover:bg-slate-700 transition-all font-semibold">
                  Upgrade nu
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
