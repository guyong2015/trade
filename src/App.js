import React, { useState, useEffect, useRef, useCallback } from 'react';

// Main App component
export default function App() {
    // State to store all parsed announcements for info tab
    const [allInfoAnnouncements, setAllInfoAnnouncements] = useState([]);
    // State to store announcements currently displayed for info tab (for infinite scroll)
    const [displayedInfoAnnouncements, setDisplayedInfoAnnouncements] = useState([]);
    // State to track the current page for loading more info announcements
    const [currentInfoPage, setCurrentInfoPage] = useState(1);
    // State to store all parsed announcements for result tab
    const [allResultAnnouncements, setAllResultAnnouncements] = useState([]);
    // State to store announcements currently displayed for result tab (for infinite scroll)
    const [displayedResultAnnouncements, setDisplayedResultAnnouncements] = useState([]);
    // State to track the current page for loading more result announcements
    const [currentResultPage, setCurrentResultPage] = useState(1);
    // Number of announcements to load per page
    const ANNOUNCEMENTS_PER_PAGE = 5;
    // State to manage the currently viewed announcement in detail mode
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    // Ref for the scrollable container to detect scroll events
    const scrollContainerRef = useRef(null);
    // State for search query
    const [searchQuery, setSearch] = useState('');
    // State for active tab
    const [activeTab, setActiveTab] = useState('info');

    // Function to parse the raw data
    const parseAnnouncements = useCallback((rawData) => {
        const sections = rawData.split('================================================================================');
        const parsed = [];
        sections.forEach(section => {
            const lines = section.trim().split('\n');
            if (lines.length > 1) {
                // Find the first line that looks like a title (starts with #)
                let title = '';
                let contentStartIndex = 0;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('#')) {
                        title = lines[i].replace(/^#\s*/, '').trim();
                        contentStartIndex = i + 1;
                        break;
                    }
                }

                // If no title found, skip this section
                if (!title) {
                    return;
                }

                // Extract content, excluding source/URL/timestamp lines and markdown tables
                let content = lines.slice(contentStartIndex).join('\n');
                content = content.replace(/\*\*来源\*\*:.*/g, '') // Remove source line
                               .replace(/\*\*URL\*\*:.*/g, '')     // Remove URL line
                               .replace(/\*\*页面标题\*\*:.*/g, '') // Remove page title line
                               .replace(/\*\*mainContent元素\*\*:.*/g, '') // Remove mainContent element line
                               .replace(/\*\*爬取时间\*\*:.*/g, '') // Remove crawl time line
                               .replace(/^-{3,}\s*$/gm, '')       // Remove horizontal rules (---)
                               .replace(/\|.*\|/g, '')            // Remove markdown tables
                               .replace(/\[请到原网址下载附件\].*/g, '') // Remove download link
                               .replace(/\*\*\*[^\*]+\*\*\*/g, '') // Remove bold/italic markdown
                               .replace(/\*\*[^\*]+\*\*/g, '')    // Remove bold markdown
                               .replace(/###\s*/g, '')            // Remove H3 markdown
                               .replace(/##\s*/g, '')             // Remove H2 markdown
                               .replace(/#\s*/g, '')              // Remove H1 markdown
                               .replace(/\s+/g, ' ')              // Replace multiple spaces with single space
                               .trim();

                // Generate summary (first 50 characters)
                const summary = content.length > 50 ? content.substring(0, 50) + '...' : content;

                parsed.push({ title, summary, fullContent: content });
            }
        });
        return parsed;
    }, []);

    // Effect to load data from both files on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch info data
                const infoResponse = await fetch('datajyxx.md');
                const infoData = await infoResponse.text();
                const parsedInfo = parseAnnouncements(infoData);
                setAllInfoAnnouncements(parsedInfo);
                setDisplayedInfoAnnouncements(parsedInfo.slice(0, ANNOUNCEMENTS_PER_PAGE));

                // Fetch result data
                const resultResponse = await fetch('datajyjg.md');
                const resultData = await resultResponse.text();
                const parsedResult = parseAnnouncements(resultData);
                setAllResultAnnouncements(parsedResult);
                setDisplayedResultAnnouncements(parsedResult.slice(0, ANNOUNCEMENTS_PER_PAGE));
            } catch (error) {
                console.error('Error fetching or parsing data:', error);
            }
        };

        fetchData();
    }, [parseAnnouncements]);

    // Function to load more announcements for infinite scrolling
    const loadMoreAnnouncements = useCallback(() => {
        if (activeTab === 'info') {
            const nextPage = currentInfoPage + 1;
            const startIndex = (nextPage - 1) * ANNOUNCEMENTS_PER_PAGE;
            const endIndex = startIndex + ANNOUNCEMENTS_PER_PAGE;
            const newAnnouncements = allInfoAnnouncements.slice(startIndex, endIndex);

            if (newAnnouncements.length > 0) {
                setDisplayedInfoAnnouncements(prev => [...prev, ...newAnnouncements]);
                setCurrentInfoPage(nextPage);
            }
        } else {
            const nextPage = currentResultPage + 1;
            const startIndex = (nextPage - 1) * ANNOUNCEMENTS_PER_PAGE;
            const endIndex = startIndex + ANNOUNCEMENTS_PER_PAGE;
            const newAnnouncements = allResultAnnouncements.slice(startIndex, endIndex);

            if (newAnnouncements.length > 0) {
                setDisplayedResultAnnouncements(prev => [...prev, ...newAnnouncements]);
                setCurrentResultPage(nextPage);
            }
        }
    }, [activeTab, allInfoAnnouncements, currentInfoPage, allResultAnnouncements, currentResultPage, ANNOUNCEMENTS_PER_PAGE]);

    // Effect for infinite scrolling
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        const handleScroll = () => {
            // Check if user has scrolled to the bottom
            if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 100) {
                // Load more announcements if there are any left
                const currentDisplayed = activeTab === 'info' ? displayedInfoAnnouncements : displayedResultAnnouncements;
                const allAnnouncements = activeTab === 'info' ? allInfoAnnouncements : allResultAnnouncements;
                
                if (currentDisplayed.length < allAnnouncements.length) {
                    loadMoreAnnouncements();
                }
            }
        };

        scrollContainer.addEventListener('scroll', handleScroll);
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [activeTab, displayedInfoAnnouncements, allInfoAnnouncements, displayedResultAnnouncements, allResultAnnouncements, loadMoreAnnouncements]);

    // Filter announcements based on search query
    const currentDisplayedAnnouncements = activeTab === 'info' ? displayedInfoAnnouncements : displayedResultAnnouncements;
    const filteredAnnouncements = currentDisplayedAnnouncements.filter(announcement =>
        announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        announcement.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Render the main list view or the detail view
    if (selectedAnnouncement) {
        return (
            <AnnouncementDetail
                announcement={selectedAnnouncement}
                onBack={() => setSelectedAnnouncement(null)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans antialiased flex flex-col items-center p-4">
            {/* Tailwind CSS CDN - This is included for direct browser execution in Canvas.
                For local development with `npm install tailwindcss`, this line should be removed
                and Tailwind should be configured in `tailwind.config.js` and imported in `index.css`. */}
            {/* <script src="https://cdn.tailwindcss.com"></script> */}
            {/* Header */}
            <header className="w-full max-w-md bg-white p-4 rounded-b-lg shadow-md fixed top-0 z-10">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-blue-600">信息列表</h1>
                    {/* Placeholder for filter/category icon */}
                    {/* <button className="text-gray-600 hover:text-gray-900 focus:outline-none">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM13 16a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2z"></path>
                        </svg>
                    </button> */}
                </div>
                
                {/* Tab Selection */}
                <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
                    <button
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                            activeTab === 'info'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                        onClick={() => setActiveTab('info')}
                    >
                        交易信息
                    </button>
                    <button
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                            activeTab === 'result'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                        onClick={() => setActiveTab('result')}
                    >
                        交易结果
                    </button>
                </div>
                {/* Search Bar */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="搜索公告..."
                        className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                </div>
            </header>

            {/* Main Content Area - Scrollable */}
            <main
                ref={scrollContainerRef}
                className="w-full max-w-md mt-40 overflow-y-auto custom-scrollbar" // Adjusted margin-top to account for fixed header with tabs
                style={{ height: 'calc(100vh - 10rem)' }} // Calculate height to fill remaining screen
            >
                <div className="space-y-4 pb-4"> {/* Add padding bottom for scroll indicator */}
                    {filteredAnnouncements.length > 0 ? (
                        filteredAnnouncements.map((announcement, index) => (
                            <AnnouncementCard
                                key={index}
                                title={announcement.title}
                                summary={announcement.summary}
                                onClick={() => setSelectedAnnouncement(announcement)}
                            />
                        ))
                    ) : (
                        <p className="text-center text-gray-600 mt-8">没有找到相关公告。</p>
                    )}
                    {(() => {
                        const currentDisplayed = activeTab === 'info' ? displayedInfoAnnouncements : displayedResultAnnouncements;
                        const allAnnouncements = activeTab === 'info' ? allInfoAnnouncements : allResultAnnouncements;
                        return currentDisplayed.length < allAnnouncements.length && (
                            <div className="text-center py-4 text-gray-500">
                                加载中...
                            </div>
                        );
                    })()}
                </div>
            </main>
        </div>
    );
}

// Component for a single announcement card
function AnnouncementCard({ title, summary, onClick }) {
    return (
        <div
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 p-4 mx-2"
            onClick={onClick}
        >
            <h2 className="text-lg font-semibold text-blue-600 mb-2 line-clamp-2">{title}</h2>
            <p className="text-sm text-gray-600 line-clamp-3">{summary}</p>
        </div>
    );
}

// Component for displaying full announcement details
function AnnouncementDetail({ announcement, onBack }) {
    return (
        <div className="min-h-screen bg-gray-100 font-sans antialiased flex flex-col p-4">
            {/* Tailwind CSS CDN - This is included for direct browser execution in Canvas.
                For local development with `npm install tailwindcss`, this line should be removed
                and Tailwind should be configured in `tailwind.config.js` and imported in `index.css`. */}
            <script src="https://cdn.tailwindcss.com"></script>
            {/* Header for detail view */}
            <header className="w-full bg-white p-4 rounded-b-lg shadow-md fixed top-0 z-10 flex items-center">
                <button
                    onClick={onBack}
                    className="text-blue-600 hover:text-blue-800 focus:outline-none mr-4"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                </button>
                <h1 className="text-xl font-bold text-blue-600 truncate">{announcement.title}</h1>
            </header>

            {/* Full content area */}
            <main className="w-full mt-20 overflow-y-auto flex-grow bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-blue-600 mb-4">{announcement.title}</h2>
                <div
                    className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: announcement.fullContent.replace(/\n/g, '<br />') }}
                ></div>
            </main>
        </div>
    );
}