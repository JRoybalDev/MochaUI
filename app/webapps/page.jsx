'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import ProfileMenu from '../components/ProfileMenu';
import { useSession } from 'next-auth/react';
import { useLoader } from '@/context/LoaderContext';

function WebApps() {
  const router = useRouter();
  const { status } = useSession();
  const { setIsLoading } = useLoader();

  const apps = [
    {
      title: "MochAI",
      description: "AI Chatbots",
      link: "/mochai",
      colors: {
        btnBG: "bg-[#6f4e37]",
        btnHOVER: "hover:bg-[#a67c52]"
      },
      status: false
    },
    {
      title: "MochList",
      description: "Playlist Manager",
      link: "/mochlist",
      colors: {
        btnBG: "bg-[#bfa27a]",
        btnHOVER: "hover:bg-[#e7d3c0]"
      },
      status: true
    }
  ]

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-[#f3e5d8] via-[#e7d3c0] to-[#bfa27a] flex flex-col items-center justify-center font-sans px-2 py-8 relative">
      <div className="absolute top-6 right-8 z-20">
        <ProfileMenu />
      </div>
      <div className="flex flex-col items-center gap-2 mb-8">
        <span className="text-5xl font-bold text-[#6f4e37] tracking-wide drop-shadow-lg">MochHome</span>
        <span className="text-lg text-[#a67c52] font-medium">Welcome! Choose an app to get started.</span>
      </div>
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full max-w-2xl">
        {apps.map((app, idx) => (
          <button
            key={idx}
            onClick={() => { setIsLoading(true); router.push(app.link); }}
            className={`flex flex-col items-center justify-center ${app.colors.btnBG} ${app.colors.btnHOVER} py-8 px-12 rounded-3xl w-64 shadow-xl border-2 border-[#bfa27a] hover:scale-105 transition-all duration-200 hover:shadow-2xl cursor-pointer disabled:cursor-not-allowed`}
            style={{ minHeight: '140px' }}
            disabled={!app.status}
          >
            <span className="text-3xl font-bold text-[#f3e5d8] mb-2 drop-shadow">{app.title}</span>
            <span className="text-sm text-[#f3e5d8] opacity-80">{app.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default WebApps
