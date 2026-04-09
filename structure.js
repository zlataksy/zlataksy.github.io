module.exports = {
    nav: [
        { id: "landing", title: "Home" },
        { id: "services", title: "Services" },
        { id: "portfolio", title: "Portfolio" },
        { id: "contacts", title: "Contacts" }
    ],
    sections: [
        {
            id: "landing",
            title: "Home",
            type: "static"
        },
        {
            id: "services",
            title: "Services",
            type: "services",
            manifestPath: "content/services-manifest.json"
        },
        {
            id: "ugc-grwm",
            title: "GRWM, Street & Unpacking",
            folder: "img/portfolio/video/2_GRWM_Street_Unpacking",
            type: "dynamic"
        },
        {
            id: "ugc-routine",
            title: "UGC: Hair & Skin Routine",
            folder: "img/portfolio/video/3_UGC_Hair_Skin_Routine",
            type: "dynamic"
        },
        {
            id: "ugc-brands",
            title: "Content For Brands",
            folder: "img/portfolio/video/4_Content_For_Brands",
            type: "dynamic"
        },
        {
            id: "video-editing",
            title: "Video Editing",
            folder: "img/portfolio/video/5_videoEditing",
            type: "dynamic"
        },
        {
            id: "backstages",
            title: "Backstages",
            folder: "img/portfolio/video/6_backstages",
            type: "dynamic"
        },
        {
            id: "contacts",
            title: "Contacts",
            type: "static"
        }
    ]
};
