require "bundler/capistrano"
require File.expand_path("../deploy/ec2_unicorn", __FILE__)

set :application, "findabikefor.me"
set :repository,  "git://github.com/gsilk/findabike.git"

set :scm, :git
set :deploy_to, "/var/www/#{application}"
set :deploy_via, :remote_cache
set :use_sudo, false
set :host_header, "_"
set :branch, ENV['DEPLOY_BRANCH'] || "master"

role :web, "ubuntu@ec2-23-22-192-226.compute-1.amazonaws.com"                          # Your HTTP server, Apache/etc
role :app, "ubuntu@ec2-23-22-192-226.compute-1.amazonaws.com"                          # This may be the same as your `Web` server

default_run_options[:pty] = true
# use local keys
ssh_options[:forward_agent] = true

after "deploy:restart", "deploy:cleanup"

task :fix_setup_permissions, :roles => [:web, :app] do
  run "chown -R ubuntu /var/www/#{application}"
  run "mkdir -p /var/www/unicorn"
  run "chown ubuntu /var/www/unicorn"
end

set :unicorn_pid do
  "#{shared_path}/pids/unicorn.pid"
end

after "deploy:setup", "fix_setup_permissions"

# if you want to clean up old releases on each deploy uncomment this:
# after "deploy:restart", "deploy:cleanup"

# if you're still using the script/reaper helper you will need
# these http://github.com/rails/irs_process_scripts

# If you are using Passenger mod_rails uncomment this:
# namespace :deploy do
#   task :start do ; end
#   task :stop do ; end
#   task :restart, :roles => :app, :except => { :no_release => true } do
#     run "#{try_sudo} touch #{File.join(current_path,'tmp','restart.txt')}"
#   end
# end