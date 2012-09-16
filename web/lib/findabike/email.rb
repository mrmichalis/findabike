require "addressable/uri"

module Findabike
  module Email
    AUTH_TTL = 4 * 60 * 60 # 4 hours

    def valid_email?(email)
      r = false
      begin
        m = Mail::Address.new(email)
        # We must check that value contains a domain and that value is an email address
        r = m.domain && m.address == email
        t = m.__send__(:tree)
        # We need to dig into treetop
        # A valid domain must have dot_atom_text elements size > 1
        # user@localhost is excluded
        # treetop must respond to domain
        # We exclude valid email values like <user@localhost.com>
        # Hence we use m.__send__(tree).domain
        r &&= (t.domain.dot_atom_text.elements.size > 1)
      rescue Exception => e   
      end
      r
    end

    def mail_authentication_link(email)
      send_message(email, "come get yer bikes, yo", "confirmation")
    end

    def mail_post(email, post)
      logger.info "mail_post got #{post.inspect}"      
      send_message(email, "here is a new post -- ", "post", binding)
    end

    private
    def host
      @host ||= case ENV['RACK_ENV']
      when 'development'
        'localhost:9393'
      when 'production'
        'findabikefor.me'
      else
        raise
      end
    end

    def path_for_auth(email)
      time = (Time.new.to_i + AUTH_TTL).to_s
      uri = Addressable::URI.new
      uri.query_values = { :email => email, :time => time, :key => signed_time(email, time) }
      "/bike?#{uri.query}"
    end

    def send_message(email, subject, template_name, b = binding)
      Mail.deliver do
        from    'system@findabikefor.me'
        to      email
        subject subject
        html_part do
          template = File.read(File.expand_path("../../root/views/mail/#{template_name}.erb", __FILE__))
          content_type 'text/html; charset=UTF-8'
          body ERB.new(template).result(b)
        end
      end
    end
  end
end
