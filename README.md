详细方案由gemini生成readme1.md
发布到jjta服务器虚路径变化时，修改package.json 
"homepage": "/trade/",   Create React App 会读取 homepage 的值，并将其作为所有静态资源（JS 文件、CSS 文件、图片、字体等）的 URL 前缀",
{
  "name": "my-react-app",
  "version": "0.1.0",
  "private": true,
  "homepage": "/trade/", // <--- 在这里添加或修改
  "dependencies": {
    // ...
}

ngrok config add-authtoken 2xvl1u6E1u8CSPHttvE5rrhNLC3_7WppSEwxW7qtYvnHVfarp
ngrok.exe http 3000 