module Findabike
  module Craigslist
    AREAS = {
      ""    => "all SF bay area",
      "sfc" => "san francisco",
      "sby" => "south bay",
      "eby" => "east bay",
      "pen" => "peninsula",
      "nby" => "north bay",
      "scz" => "santa cruz"
    }

    def generate_craigslist_url(area, keywords)
      raise unless AREAS.keys.include?(area)
      raise unless keywords.size < 250
      area = "/#{area}" unless area == ''
      "http://sfbay.craigslist.org/search/bia#{area}?query=#{URI.escape(keywords)}&srchType=A"
    end
  end
end