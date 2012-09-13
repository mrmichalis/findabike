require 'digest/sha1'

module Findabike
  module Auth
    SECRET = ENV['AUTH_SECRET'] or raise

    def signed_body(body)
      Digest::SHA1.hexdigest([body, SECRET].join(''))
    end

    def signed_time(email, time)
      Digest::SHA1.hexdigest([email, time, SECRET].join('/'))
    end

    def valid_sig?(email, time, sig)
      time_i = Integer(time)
      puts "email: #{email}"
      puts "time: #{time}"
      puts "sig: #{sig}"
      puts "time_i: #{time_i}"
      puts "signed_time(email, time): #{signed_time(email, time)}"
      puts "Time.new.to_i < time_i: #{Time.new.to_i < time_i}"
      Time.new.to_i < time_i and signed_time(email, time) == sig
    end
  end
end