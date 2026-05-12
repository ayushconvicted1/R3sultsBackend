/**
 * Landing Page CMS — Default Seed Data
 *
 * Each entry maps to one row in the `landing_content` table.
 * The `content` field holds the full JSON structure for the section.
 *
 * Pages: shared, home, about, contact
 */

const seedData = [
  // ═══════════════════════════════════════════════════════════
  // SHARED
  // ═══════════════════════════════════════════════════════════
  {
    page: 'shared',
    section: 'footer',
    sortOrder: 0,
    content: {
      brand: {
        logoColor: 'white',
        tagline: 'Respond. Recover. Rebuild. — A Disaster Management Ecosystem That Saves Lives!',
      },
      quickLinksTitle: 'Quick Links',
      quickLinks: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'News and Media', href: '/news-and-media' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms and conditions', href: '/terms-and-condition' },
      ],
      contactTitle: 'Contact',
      contact: {
        phone: { display: '+1 954-231-1750', href: 'tel:+19542311750' },
        email: { display: 'info@r3sults.com', href: 'mailto:info@r3sults.com' },
        address: '2120 SW , 60th Ter Miramar, FL 33023',
      },
      connectTitle: 'Connect',
      socialLinks: [
        { platform: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61583899421911', ariaLabel: 'Facebook', iconKey: 'facebook' },
        { platform: 'Instagram', href: 'https://www.instagram.com/r3sultsglobal/', ariaLabel: 'Instagram', iconKey: 'instagram' },
        { platform: 'LinkedIn', href: 'https://www.linkedin.com/company/r3sults/', ariaLabel: 'LinkedIn', iconKey: 'linkedin' },
        { platform: 'YouTube', href: 'https://youtube.com/@r3sults-global?si=X7TY0w28nM9pDrei', ariaLabel: 'YouTube', iconKey: 'youtube' },
        { platform: 'Twitter/X', href: 'https://x.com/R3sultsGlobal', ariaLabel: 'Twitter/X', iconKey: 'twitter_x' },
        { platform: 'Reddit', href: 'https://www.reddit.com/user/Sea-End-4763/', ariaLabel: 'Reddit', iconKey: 'reddit' },
      ],
      newsletter: {
        title: 'Subscribe to our newsletter',
        input: { placeholder: 'Enter your email', ariaLabel: 'email' },
        button: { defaultLabel: 'Please join', loadingLabel: 'Subscribing' },
        api: { endpoint: '/api/newsletter/subscribe', method: 'POST', payload: { email: '<email>' } },
      },
      copyrightText: '© 2026 R3sults. All rights reserved.',
    },
  },
  {
    page: 'shared',
    section: 'forms',
    sortOrder: 1,
    content: {
      emailLaunchForm: {
        inputPlaceholder: 'Enter your email',
        buttonLabel: 'Submit',
        buttonLoadingLabel: 'Submitting',
        api: { endpoint: '/api/email', method: 'POST', payload: { email: '<email>', source: '<source>' } },
        successToast: 'We have received your email for newsletter subscription.',
        errorToast: 'Something went wrong. Please try again.',
      },
    },
  },

  // ═══════════════════════════════════════════════════════════
  // HOME
  // ═══════════════════════════════════════════════════════════
  {
    page: 'home',
    section: 'hero',
    sortOrder: 0,
    content: {
      sectionId: 'hero',
      backgroundVideo: { src: '/HeroVid1.mp4', stopBeforeEndSeconds: 1 },
      headlineLines: [
        'Helping resolve the',
        'Overcoming Disaster :',
        'Using People, Technology & AI',
      ],
      description: 'A disaster management ecosystem that helps people , through coordination of real time intelligence , connected devices and active people.',
      newsletterCard: {
        title: 'Please join our newsletter to get latest updates on our launch & offers!',
        formType: 'shared.footer.newsletter',
      },
    },
  },
  {
    page: 'home',
    section: 'delayedEmergencyResponse',
    sortOrder: 1,
    content: {
      title: { prefix: 'The True Cost of', highlight: 'Delayed Emergency Response' },
      subtitle: "Disasters don't just destroy infrastructure – they steal time, lives, and hope.",
      backgroundImage: '/CrisisBG.png',
      statsCards: [
        { value: '$100+', valueCaption: 'Billions', title: 'Average annual disaster damage in the United States', description: 'Climate-driven disasters are increasing in frequency and severity every year.' },
        { value: '16,000+', valueCaption: 'Lives Lost', title: 'In U.S. disasters since 1980', description: 'Climate-driven disasters are increasing in frequency and severity every year.' },
        { value: '5,000+', valueCaption: 'Missing', title: 'During floods, hurricanes, fires, and earthquakes', description: 'Families lose contact. Responders lack precise location data.' },
        { value: '30-40%', valueCaption: 'Lost Lives', title: 'Could be avoided with faster location, communication, and response', description: 'Minutes matter. Technology saves lives.' },
      ],
      closingLine: { prefix: 'When help is late,', brand: 'R3SULTS', suffix: 'shows up!' },
    },
  },
  {
    page: 'home',
    section: 'buildingSection',
    sortOrder: 2,
    content: {
      sectionId: 'features',
      title: { prefix: 'What we are', highlight: 'building?' },
      description: 'An easy-to-use disaster management platform that provides comprehensive tools and resources to help you prepare, respond, and recover from any crisis.',
      carouselCards: [
        { title: 'Consumer Mobile App', iconKey: 'consumer_mobile_app', bullets: ['Real-time disaster alerts powered by AI', 'Preparedness checklists and safety protocols', 'Shelter & evacuation mapping', 'Insurance guidance & emergency supplies', 'Medical & first-aid support'] },
        { title: 'Family Finder System', iconKey: 'family_finder_system', bullets: ['Real-Time Location Tracking', 'Status Sharing & Safety Check-Ins', 'Offline & Low-Network Functionality', 'Rescue Coordination Support'] },
        { title: 'Smart Safety Wearable', iconKey: 'smart_safety_wearable', bullets: ['GPS enable live tracking', 'Live Family Finder', 'Emergency SOS', 'Heart Rate, Temperature and step counts', 'Fall detection for seniors', 'Waterproof', 'Up to 7 days battery life'] },
      ],
      supportImage: { src: '/IPadImg.webp', alt: 'Tablet/Smartphone Visual' },
    },
  },
  {
    page: 'home',
    section: 'lifelineSection',
    sortOrder: 3,
    content: {
      title: { prefix: 'Your', highlight: 'Lifeline', suffix: 'in Crisis' },
      description: 'Comprehensive disaster preparedness and response features designed to keep you and your loved ones safe.',
      featureCards: [
        { title: 'Disaster Alerts', descriptionLines: ['AI-powered real-time', 'notifications for imminent', 'threats in your area'], iconKey: 'disaster_alerts', image: '/disaster_alerts.jpg' },
        { title: 'Shelter Locator', descriptionLines: ['AI-powered real-time', 'find nearby safe shelters', 'with live capacity information'], iconKey: 'shelter_locator', image: '/shelter_locator.jpg' },
        { title: 'Medical Assistance', descriptionLines: ['AI-powered real-time', 'connect with emergency', 'medical services and resources'], iconKey: 'medical_assistance', image: '/medical_assistance.jpg' },
        { title: 'Insurance & Relief', descriptionLines: ['AI-powered real-time', 'streamline insurance claims', 'and relief program access'], iconKey: 'insurance_relief', image: '/insurance_relief.jpg' },
        { title: 'Emergency Supplies', descriptionLines: ['AI-powered real-time', 'locate stores for essential', 'supplies and provisions'], iconKey: 'emergency_supplies', image: '/emergency_supplies.jpg' },
        { title: 'Family Finder', descriptionLines: ['AI-powered real-time', 'pinpoint loved ones', 'via GPS or data'], iconKey: 'family_finder', image: '/family_finder.jpg' },
        { title: 'Damage Reporting', descriptionLines: ['AI-powered real-time', 'document and report damage', 'for expedited aid efforts'], iconKey: 'damage_reporting', image: '/damage_reporting.jpg' },
        { title: 'Recovery Tracking', descriptionLines: ['AI-powered real-time', 'monitor restoration progress', 'and community rebuilding'], iconKey: 'recovery_tracking', image: '/recovery_tracking.jpg' },
      ],
      newsletterCta: {
        label: 'Be Disaster-Ready. Subscribe for Launch Updates',
        form: { source: 'newsletter', type: 'shared.forms.emailLaunchForm' },
      },
    },
  },
  {
    page: 'home',
    section: 'comingSoonSection',
    sortOrder: 4,
    content: {
      revealHeading: 'Revealing soon',
      productImage: { src: '/WatchImg.png', alt: 'Smart Safety Wearable' },
      titleLines: ['IOT-powered Wearable', 'for emergency', 'tracking'],
      subtitle: 'Join the Early Access Program',
      form: { source: 'newsletter', type: 'shared.forms.emailLaunchForm' },
    },
  },
  {
    page: 'home',
    section: 'inActionVideos',
    sortOrder: 5,
    content: {
      mobileSection: { sectionId: 'hero-mobile', videoSrc: '/ActionMob.mp4', controls: true },
      desktopSection: { sectionId: 'hero', videoSrc: '/Action.mp4', controls: true },
    },
  },
  {
    page: 'home',
    section: 'testimonialsSection',
    sortOrder: 6,
    content: {
      title: { prefix: 'Our', highlight: 'Testimonials' },
      description: 'Real feedback from users and teams who rely on R3sults during critical moments.',
      cards: [
        { id: 1, name: 'Sophia Carter', role: 'Community Volunteer', avatar: '/Impact2.jpg', rating: 5, feedback: 'The alerts and family tracking features gave us confidence during a difficult storm. The platform felt reliable and fast.', videoTitle: 'How R3sults helped our neighborhood', videoSrc: '/Action.mp4', buttonLabel: 'Watch Video Feedback' },
        { id: 2, name: 'Noah Bennett', role: 'Insurance Partner', avatar: '/Impact1.jpg', rating: 4, feedback: 'Damage reporting and communication tools reduced confusion for families and responders. Great user experience.', videoTitle: 'Field feedback from insurance team', videoSrc: '/Action.mp4', buttonLabel: 'Watch Video Feedback' },
        { id: 3, name: 'Mia Thompson', role: 'Relief Operations Lead', avatar: '/Impact2.jpg', rating: 5, feedback: 'The interface is modern, the information is timely, and our teams can make decisions much faster than before.', videoTitle: 'Relief operations testimonial', videoSrc: '/Action.mp4', buttonLabel: 'Watch Video Feedback' },
      ],
      modal: { closeAriaLabel: 'Close video modal', overlayCloseAriaLabel: 'Close modal overlay', fallbackText: 'Your browser does not support the video tag.' },
    },
  },
  {
    page: 'home',
    section: 'liveImpactUpdates',
    sortOrder: 7,
    content: {
      title: { prefix: 'Live Impact', highlight: 'Updates' },
      description: 'Real-time stories from the field, community highlights, and relief operations.',
      items: [
        { title: 'Flash floods devastate coastal cities, emergency services overwhelmed', paragraph: 'Floods devastate coastal cities, infrastructure overwhelmed, emergency systems over-stressed.', date: 'May 8, 2026', time: '10:30 AM', image: '/Impact3.jpeg', sourceLink: 'https://r3sults.com/impact/coastal-floods', country: 'USA' },
        { title: 'Wildfires spread rapidly, communities evacuated', paragraph: 'Wildfires spread rapidly, communities evacuated, homes lost and people struggling.', date: 'May 7, 2026', time: '02:15 PM', image: '/Impact1.jpg', sourceLink: 'https://r3sults.com/impact/wildfires', country: 'Canada' },
        { title: 'Earthquake strikes urban region, buildings damaged, rescue operations underway', paragraph: 'Earthquake strikes urban region, buildings damaged, rescue operations underway.', date: 'May 6, 2026', time: '08:45 AM', image: '/Impact4.jpg', sourceLink: 'https://r3sults.com/impact/earthquake', country: 'Japan' },
        { title: 'Hurricane causes widespread power outages, relief efforts mobilized', paragraph: 'Hurricane causes widespread power outages, relief efforts mobilized across affected regions.', date: 'May 5, 2026', time: '11:20 PM', image: '/Impact2.jpg', sourceLink: 'https://r3sults.com/impact/hurricane', country: 'Bahamas' },
      ],
    },
  },
  {
    page: 'home',
    section: 'instagramReels',
    sortOrder: 8,
    content: {
      title: { prefix: 'Our', highlight: 'Instagram Reels' },
      description: 'Check out our latest updates and stories on Instagram.',
      reels: [
        { videoPath: '/Action.mp4', title: 'Community Resilience', subtitle: 'How we rebuild together', link: 'https://www.instagram.com/r3sultsglobal/' },
        { videoPath: '/HeroVid1.mp4', title: 'AI in Action', subtitle: 'Predicting threats in real-time', link: 'https://www.instagram.com/r3sultsglobal/' },
        { videoPath: '/Action.mp4', title: 'Field Support', subtitle: 'On the ground when it matters', link: 'https://www.instagram.com/r3sultsglobal/' },
        { videoPath: '/HeroVid1.mp4', title: 'Join the Mission', subtitle: 'Together we save lives', link: 'https://www.instagram.com/r3sultsglobal/' },
        { videoPath: '/Action.mp4', title: 'Tech for Good', subtitle: 'Innovating disaster response', link: 'https://www.instagram.com/r3sultsglobal/' },
      ],
    },
  },
  {
    page: 'home',
    section: 'guidesResourcesSection',
    sortOrder: 9,
    content: {
      sectionId: 'resources',
      title: { prefix: 'Disaster Preparedness', highlight: 'Guides & Resources' },
      description: 'Stay informed and be ready for any situation.',
      guides: [
        { title: 'Emergency Kit Preparation Guide', subtitle: '', image: '/Guide1.png', fileUrl: '', description: 'Essential items and supplies checklist for emergency preparedness.', date: 'Dec 27, 2025', downloadIconKey: 'download_arrow' },
        { title: 'Disaster Risk Planning Handbook', subtitle: '', image: '/Guide2.png', fileUrl: '', description: 'Comprehensive guide for disaster risk planning and mitigation strategies.', date: 'Dec 27, 2025', downloadIconKey: 'download_arrow' },
        { title: 'Government Emergency Action Guide', subtitle: '', image: '/Guide3.png', fileUrl: '', description: 'Official protocols and procedures for government agencies during emergencies.', date: 'Dec 27, 2025', downloadIconKey: 'download_arrow' },
        { title: 'Community Preparedness Toolkit', subtitle: '', image: '/Guide4.png', fileUrl: '', description: 'Resources for building resilient communities and neighborhood networks.', date: 'Dec 27, 2025', downloadIconKey: 'download_arrow' },
        { title: 'Wildfire Safety & Evacuation Guide', subtitle: '', image: '/Guide5.png', fileUrl: '', description: 'Critical safety measures and evacuation procedures for wildfire emergencies.', date: 'Dec 27, 2025', downloadIconKey: 'download_arrow' },
        { title: 'Emergency Wearables Guide', subtitle: '', image: '/Guide6.png', fileUrl: '', description: 'How to use smart devices and wearables for emergency alerts and communication.', date: 'Dec 27, 2025', downloadIconKey: 'download_arrow' },
        { title: 'Coastal Disaster Readiness Guide', subtitle: '', image: '/Guide7.png', fileUrl: '', description: 'Preparedness strategies for hurricanes, tsunamis, and coastal emergencies.', date: 'Dec 27, 2025', downloadIconKey: 'download_arrow' },
        { title: 'Emergency Coordination Guide', subtitle: '', image: '/Guide8.png', fileUrl: '', description: 'Effective communication and coordination protocols for emergency response teams.', date: 'Dec 27, 2025', downloadIconKey: 'download_arrow' },
      ],
    },
  },
  {
    page: 'home',
    section: 'communitySection',
    sortOrder: 10,
    content: {
      tag: 'Our Community',
      title: 'Join our community',
      description: 'Stay connected with the R3sults mission to protect families and responders. Subscribe to receive disaster alert updates, launch announcements, and helpful preparedness content directly in your inbox.',
      featureHighlights: [
        'Real-time emergency and platform alerts',
        'Product updates, offers, and launch news',
      ],
      card: {
        title: 'Get email alerts and marketing updates',
        description: 'Click the email field to open the form, verify the code, then tap Join.',
        joinTrigger: { helperText: 'Tap below to open the form and join.', inputPlaceholder: 'Enter your email', buttonLabel: 'Join' },
        joinModal: {
          title: 'Join our community',
          subtitle: 'Alerts, preparedness tips, and product updates.',
          fields: {
            firstNameLabel: 'First name',
            lastNameLabel: 'Last name',
            phoneLabel: 'Phone number',
            stateLabel: 'State',
            statePlaceholder: 'Select state',
            emailLabel: 'Email',
            captchaTitle: 'Verification',
            captchaInstructionLabel: 'Enter the characters shown',
            captchaPlaceholder: 'Match letters (uppercase)',
          },
          buttonLabel: 'Join',
          buttonLoadingLabel: 'Joining…',
          validationErrors: {
            name: 'Please enter your first and last name.',
            phone: 'Please enter a valid phone number.',
            state: 'Please select your state.',
            email: 'Please enter a valid email address.',
            captcha: 'Captcha does not match. Try again.',
          },
          api: { endpoint: '/api/newsletter/subscribe', method: 'POST', payload: { email: '<email>' } },
          successToast: "You're in — welcome to the community.",
          errorToast: 'Something went wrong. Please try again.',
        },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════
  // ABOUT
  // ═══════════════════════════════════════════════════════════
  {
    page: 'about',
    section: 'hero',
    sortOrder: 0,
    content: {
      sectionId: 'hero',
      backgroundImage: '/AboutHeroBG.png',
      headlineLines: [
        'Building a Disaster',
        'Ecosystem Powered',
        'by Advanced Technology',
        'and 220+ Years of',
        'Combined Expertise',
      ],
      description: 'A disaster ecosystem powered by technology that saves lives faster, recovers smarter, and rebuilds stronger.',
    },
  },
  {
    page: 'about',
    section: 'visionMissionSection',
    sortOrder: 1,
    content: {
      vision: {
        title: { prefix: 'Our', highlight: 'Vision' },
        description: 'To become the world\'s most trusted private disaster relief platform—setting the global standard for technology-powered emergency response, resilience, and sustainable recovery across North America, the Caribbean, and beyond.',
        image: { src: '/OurVision.png', alt: 'Our Vision' },
      },
      mission: {
        title: { prefix: 'Our', highlight: 'Mission' },
        description: 'To transform disaster relief through speed, intelligence, and innovation—saving lives, protecting livelihoods, and restoring communities when it matters most.',
        image: { src: '/OurMission.png', alt: 'Our Mission' },
      },
    },
  },
  {
    page: 'about',
    section: 'teamLeadershipSection',
    sortOrder: 2,
    content: {
      title: { prefix: 'Meet The', highlight: 'Team' },
      description: 'Unified by a shared vision to transform disaster response through technology and compassion',
      members: [
        {
          name: 'Matthew Cohen', role: 'Chief Executive Officer', focus: 'Strategy & Scaling',
          image: { src: '/Team4.png', alt: 'Matthew Cohen (CEO)' },
          bio: 'Matthew Cohen is an experienced executive, founder, and advisor with more than 40 years of experience working with both public and private companies in complex financial and operational environments. Over the course of his career, he has guided organizations through the full business lifecycle, often described as supporting companies "from womb to tomb," meaning from formation and capital raising to growth, public market transactions, and strategic exits. Mr. Cohen has founded and advised several public and private companies, with deep experience in areas such as going-public transactions, reverse mergers, complex SEC reporting, technical accounting, derivative liability analysis, business combinations, valuations, and structuring debt and equity financings. He is particularly well known in the microcap space, where he collaborates closely with attorneys, accounting firms, and investment bankers to help companies navigate sophisticated transactions and maintain strong governance. He has more than 30 years of experience managing public companies and serving in board and executive leadership roles. Currently, Mr. Cohen serves as CEO of two public companies and CFO of two private companies, where he focuses on strategic growth initiatives, capital markets strategy, and expanding companies into new domestic and international markets through specialty services and targeted acquisitions.',
          bioPresentation: { type: 'expandable', previewLines: 4 },
        },
        {
          name: 'Herbert V. Tremble II', role: 'Chief Operating Officer', focus: 'Operations, Response & Recovery',
          image: { src: '/Team3.png', alt: 'Herbert V. Tremble II (COO)' },
          bio: 'A seasoned disaster-relief and construction expert with decades of experience across the U.S. and the Caribbean. FA, TA-trained operator and successful multi-million-dollar entrepreneur, he brings deep operational and on-ground response expertise to large-scale disasters.',
          bioPresentation: { type: 'static' },
        },
        {
          name: 'S. Robert August', role: 'Chief Revenue Officer', focus: 'Sales, Marketing, Management, and Disaster Relief Expert',
          image: { src: '/Team1.png', alt: 'S. Robert August' },
          bio: 'Nationally and globally accomplished, acclaimed, and award-winning 50+ year veteran in marketing, management, fundraising, and sales leadership, with deep expertise in new and existing real estate development and large-scale construction projects. He brings a proven track record across public and private sectors, uniting strategic growth, capital formation, and operational excellence. His career includes a distinguished history of disaster relief preparedness, emergency response coordination, and long-term recovery, leading multi-stakeholder initiatives with government agencies, NGOs, private sector partners, and community organizations to deliver resilient, sustainable outcomes at scale.',
          bioPresentation: { type: 'expandable', previewLines: 4 },
        },
      ],
    },
  },
  {
    page: 'about',
    section: 'teamAdditionalSection',
    sortOrder: 3,
    content: {
      members: [
        {
          name: 'Ajay Verma', role: 'Chief Technology Officer', focus: 'Technology, Engineering & Product',
          image: { src: '/Team2.png', alt: 'Ajay Verma' },
          bio: 'An accomplished tech leader with 24 years of international experience in tech, AI, operations, marketing and business strategy. Engineering graduate from IIT, MBA from Harvard University. Lived and worked across 4 countries, bringing a global perspective to disaster tech innovation.',
          bioPresentation: { type: 'static' },
        },
        {
          name: 'Sam Yates', role: 'Executive VP', focus: 'Public Relations & Communication',
          image: { src: '/Team6.png', alt: 'Sam Yates' },
          bio: 'A veteran communicator who has shaped public perception across industries. Sam leads R3sults\' media presence, amplifying our mission and ensuring our work reaches the communities, partners, and supporters who need to hear it most.',
          bioPresentation: { type: 'expandable', previewLines: 4 },
        },
        {
          name: 'KT Catlin', role: 'CEO and Co-founder at R3sults Foundation', focus: 'Non-Profit & Fundraising - Strategy & Scaling',
          image: { src: '/Team5.png', alt: 'KT Catlin' },
          bio: 'Katherine "K.T." Catlin is a highly accomplished sales and marketing executive in the real estate and home building industries, with decades of experience driving revenue growth, market penetration, and strategic initiatives. Since 2018, as owner of KT Consulting & Associates LLC in Palm Beach, Florida, she offers specialized marketing strategies, consultations, and team-building solutions for housing professionals and property owners. From 2013 to 2023, K.T. served as Executive Officer for multiple Local Builders Associations, managing daily operations, educational programs, advocacy, budgeting, and fundraising. Earlier in her career (1989-2017), she held senior leadership roles, including Director of Sales & Marketing, Sales Manager, Regional New Homes Director, and Licensed Real Estate Broker at major firms such as Weichert Realtors, Coldwell Banker, Century 21, and RE/MAX. K.T. has consistently earned top industry recognition, including Sales Director of the Year, Associate of the Year, and induction into the NJBA Associate Hall of Fame. A dedicated leader, she holds prestigious certifications: GRI, CSP, CMP, and CLHMS. Civically engaged, K.T. is a member of the Town of Palm Beach Architectural Review Commission and a United Way volunteer. She earned a B.A. in Fine Arts from Fairleigh Dickinson University and brings strategic vision, strong leadership, and deep industry expertise to deliver exceptional results at R3sults Foundation.',
          bioPresentation: { type: 'expandable', previewLines: 4 },
        },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════
  // CONTACT
  // ═══════════════════════════════════════════════════════════
  {
    page: 'contact',
    section: 'hero',
    sortOrder: 0,
    content: {
      sectionId: 'hero',
      backgroundImageDesktop: '/ContactBG.png',
      title: 'Connect with us',
      subtitleLines: [
        'to respond faster, recover smarter, and',
        'rebuild stronger',
      ],
    },
  },
  {
    page: 'contact',
    section: 'contactSection',
    sortOrder: 1,
    content: {
      title: 'Contact Us',
      description: "Please feel free to contact us, we'll get back to you as soon as possible.",
      form: {
        fields: [
          { name: 'name', label: 'Name :', type: 'text', placeholder: 'Enter your name', required: true },
          { name: 'email', label: 'Email :', type: 'email', placeholder: 'Enter your email', required: true },
          { name: 'message', label: 'Message :', type: 'textarea', placeholder: 'Enter your message', rows: 6, required: true },
        ],
        submitButton: { defaultLabel: 'Send', loadingLabel: 'Sending...' },
        messages: { success: "Thank you! We've received your message and will get back to you soon.", error: 'Something went wrong. Please try again.' },
        api: {
          primaryEndpoint: '/api/email',
          method: 'POST',
          payload: { email: '<email>', source: 'contact' },
          notes: ['Current frontend sends email+source only.', 'name and message are collected in UI and logged in console; extend backend endpoint if full message capture is required.'],
        },
      },
      contactInfo: {
        visitUs: { title: 'Visit us', text: '2120 SW , 60th Ter Miramar, FL 33023' },
        callUs: { title: 'Call us', phone: { display: '+1 954-231-1750', href: 'tel:+19542311750' } },
        followUs: {
          title: 'Follow Us on',
          links: [
            { platform: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61583899421911&mibextid=wwXIfr&rdid=uDRB3XdrvUZvjwir&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1CH3z97LJM%2F%3Fmibextid%3DwwXIfr#', ariaLabel: 'Facebook', iconKey: 'facebook' },
            { platform: 'Instagram', href: 'https://www.instagram.com/r3sultsglobal/', ariaLabel: 'Instagram', iconKey: 'instagram' },
            { platform: 'Twitter/X', href: 'https://twitter.com', ariaLabel: 'Twitter/X', iconKey: 'twitter_x' },
            { platform: 'Linkdin', href: 'https://www.linkedin.com/company/r3sults/', ariaLabel: 'Linkdin', iconKey: 'linkedin' },
            { platform: 'Youtube', href: 'https://youtube.com/@r3sults-global?si=X7TY0w28nM9pDrei', ariaLabel: 'Youtube', iconKey: 'youtube' },
            { platform: 'Reddit', href: 'https://www.reddit.com/r/r3sults/', ariaLabel: 'Reddit', iconKey: 'reddit' },
          ],
        },
      },
    },
  },
  {
    page: 'contact',
    section: 'quoteSection',
    sortOrder: 2,
    content: {
      quote: '"Safety should depend on dissaster preparedness!"',
    },
  },
];

module.exports = seedData;
