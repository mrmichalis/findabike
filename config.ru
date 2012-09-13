$:.push File.expand_path("../web/lib", __FILE__)

require 'findabike'

run Findabike::Web.new