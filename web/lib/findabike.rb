require 'sinatra'
require 'redis'
require 'json'
require 'mail'
require 'cgi'
require 'uri'

require 'findabike/email'
require 'findabike/craigslist'
require 'findabike/auth'

Mail.defaults do
  delivery_method :smtp, {
    :enable_starttls_auto => true,
    :address        => "smtp.gmail.com",
    :port           => 587,
    :domain         => "findabikefor.me",
    :authentication => :plain,
    :user_name      => ENV['MAIL_USERNAME'],
    :password       => ENV['MAIL_PASSWORD'] }
end

module Findabike
  class Web < Sinatra::Base
    include Email
    include Auth
    include Craigslist

    set :root, File.expand_path('../root', __FILE__)
    set :public_folder, Proc.new { File.join(root, "public") }
    set :views, Proc.new { File.join(root, "views") }

    enable :sessions
    set :session_secret, ENV['AUTH_SECRET']
    enable :logging

    before do
      @redis_client = Redis.new
      @errors = []
      @notices = []

      @notices << session.delete(:notice)
      @notices.compact!
      if request.path == '/bike'
        logger.info "authing, session[:email]: #{session[:email]}"
        if params[:email] && params[:time] && params[:key]
          if valid_sig?(params[:email], params[:time], params[:key])
            logger.info "putting in the session #{params[:email]}"
            session[:email] = params[:email]
            redirect "/bike" and return
          end
        end

        unless @email = session[:email]
          redirect "/"
        end

        if data = @redis_client.get(@email) and url = JSON.parse(data)['url']
          logger.info "using #{url} from redis"

          parsed_uri = URI(url)
          search_params = Rack::Utils.parse_query(parsed_uri.query)
          @area = parsed_uri.path[/\/bia\/?(.*)$/, 1]
          @keywords = search_params['query']

          logger.info "@area: #{@area.inspect} #{@keywords.inspect}"
        end
      end
    end

    get "/" do
      if session[:email]
        redirect "/bike"
      else
        erb :index
      end
    end

    post "/" do
      email = params[:email]
      if valid_email?(email)
        if @redis_client.exists(params[:email])
          mail_authentication_link(email)
          erb :sent_link
        else
          session[:email] = email
          @redis_client.set email, {"email" => email, "state" => "inactive" }.to_json
          redirect "/bike"
        end
      else
        @errors << "Email is invalid; what you tryin' to pull buddy!"
        erb :index
      end
    end

    get "/logout" do
      session.delete(:email)
      session[:notice] = "youre logged out dawg"
      redirect "/"
    end

    get "/bike" do
      logger.info "email is #{@email}"
      erb :bike
    end

    post "/bike" do
      @redis_client.set @email, {"email" => @email, "state" => "active", "url" => generate_craigslist_url(params[:area], params[:keywords]) }.to_json
      @redis_client.publish("new-users", @email)
      session[:notice] = "okay, its been saved"
      redirect '/bike'
    end

    post "/sendmail/:key" do
      request.body.rewind
      body = request.body.read
      if params[:key] == signed_body(body)
        parsed_body = JSON.parse(body)
        mail_post(parsed_body['email'], parsed_body)
        halt 200
      else
        halt 403
      end
    end
  end
end
