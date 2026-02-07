import React from 'react';

export const InventorySkeleton = () => {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-start">
          <div className="flex-1 pr-4 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="flex gap-2">
                <div className="h-3 bg-slate-100 rounded w-16"></div>
                <div className="h-3 bg-slate-100 rounded w-12"></div>
            </div>
          </div>
          <div className="w-16 space-y-2 flex flex-col items-end">
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-3 bg-slate-100 rounded w-8"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const CustomerSkeleton = () => {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-3 bg-slate-100 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
};
