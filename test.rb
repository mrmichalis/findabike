`node -v`[/^v0\.8/] or raise "you need node 0.8.x"

unless File.exist?("./scraper/node_modules")
  `cd scraper && npm install`
end

#scraper_pid = fork { Dir.chdir('scraper') { system("node sweeper.js") } }
# { Dir.chdir('scraper') { system("node poster.js") } }
#
#`cd scraper && node sweeper #