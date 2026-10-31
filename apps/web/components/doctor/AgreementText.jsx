'use client'

import ReactMarkdown from 'react-markdown'

// The agreement is plain markdown (## per section); styled to match the Terms & Conditions page.
export default function AgreementText({ content }) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2 mt-6 first:mt-0 text-gray-900" {...props} />,
        p: ({ node, ...props }) => <p className="mb-3 text-gray-600 leading-relaxed text-sm sm:text-base" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
