import Link from 'next/link'
import BrandWordmark from '@/components/BrandWordmark'

export default function LandingFooter() {
    return (
        <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                <BrandWordmark size="lg" variant="dark" className="mb-6 opacity-90 hover:opacity-100 transition-opacity" />
                <p className="text-gray-500 max-w-xl mb-8 leading-relaxed">
                    Empowering audiology and speech therapy care through modern digital solutions. Connecting the right patients with the right specialists for a seamless healthcare experience.
                </p>
                <div className="flex items-center justify-center gap-8 mb-12">
                    <Link href="/patients" className="text-sm font-medium hover:text-white transition-colors">For Patients</Link>
                    <span className="text-gray-700">•</span>
                    <Link href="/for-doctors" className="text-sm font-medium hover:text-white transition-colors">For Doctors</Link>
                </div>
                <div className="border-t border-gray-800/60 w-full pt-8 text-sm text-gray-500 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>© {new Date().getFullYear()} gocare. All rights reserved.</div>
                    <div className="flex gap-6 max-sm:flex-col max-sm:gap-2 max-sm:items-center">
                        <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms-and-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link>
                        <Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
